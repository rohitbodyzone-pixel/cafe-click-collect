-- Production payment foundation for Stripe TEST MODE.
-- Safe to re-run: no existing tables or order data are dropped.
-- Stripe secret keys must be stored only as Supabase Edge Function secrets,
-- never in this schema or in the Expo application.

create table if not exists public.payment_settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'nzd' check (currency ~ '^[a-z]{3}$'),
  card_enabled boolean not null default true,
  apple_pay_enabled boolean not null default true,
  google_pay_enabled boolean not null default true,
  pay_at_counter_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists payment_settings_set_updated_at on public.payment_settings;
create trigger payment_settings_set_updated_at
before update on public.payment_settings
for each row execute function public.set_orders_updated_at();

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists amount_paid_cents integer not null default 0;
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists refunded_at timestamptz;

update public.orders
set payment_method = coalesce(payment_method, 'pay_at_counter'),
    payment_status = coalesce(payment_status, 'unpaid')
where payment_method is null or payment_status is null;

alter table public.orders alter column payment_method set default 'pay_at_counter';
alter table public.orders alter column payment_method set not null;
alter table public.orders alter column payment_status set default 'unpaid';
alter table public.orders alter column payment_status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_method_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_payment_method_check
      check (payment_method in ('card','apple_pay','google_pay','pay_at_counter')) not valid;
    alter table public.orders validate constraint orders_payment_method_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_status_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in ('paid','unpaid','failed','refunded')) not valid;
    alter table public.orders validate constraint orders_payment_status_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_amount_paid_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_amount_paid_check check (amount_paid_cents >= 0) not valid;
    alter table public.orders validate constraint orders_amount_paid_check;
  end if;
end $$;

create unique index if not exists orders_stripe_payment_intent_unique
  on public.orders (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists orders_payment_status_created_idx
  on public.orders (payment_status, created_at desc);

-- Pending checkout data is deliberately separate from orders. The admin order
-- queue therefore sees an online order only after Stripe's signed webhook confirms it.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  checkout_token uuid not null default gen_random_uuid() unique,
  idempotency_key text not null unique,
  proposed_order_id text not null,
  customer_key text not null,
  order_type text not null check (order_type in ('pickup','table')),
  order_payload jsonb not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'nzd' check (currency ~ '^[a-z]{3}$'),
  payment_method text not null check (payment_method in ('card','apple_pay','google_pay')),
  status text not null default 'created' check (status in ('created','pending','requires_action','succeeded','failed','cancelled','refunded')),
  stripe_payment_intent_id text,
  stripe_event_id text,
  failure_message text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_attempts_stripe_intent_unique
  on public.payment_attempts (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index if not exists payment_attempts_stripe_event_unique
  on public.payment_attempts (stripe_event_id) where stripe_event_id is not null;
create index if not exists payment_attempts_status_created_idx
  on public.payment_attempts (status, created_at desc);
create index if not exists payment_attempts_pickup_slot_idx
  on public.payment_attempts ((order_payload->>'pickup_slot'), expires_at)
  where order_type = 'pickup' and status in ('created','pending','requires_action');

drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function public.set_orders_updated_at();

-- A refund is requested by staff, but only the server-side Stripe function can
-- execute it and record the Stripe refund identifier.
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id),
  amount_cents integer not null check (amount_cents > 0),
  reason text,
  status text not null default 'requested' check (status in ('requested','processing','succeeded','failed','cancelled')),
  stripe_refund_id text unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_message text
);

create index if not exists refund_requests_order_idx on public.refund_requests (order_id, requested_at desc);

-- Public clients may read payment availability only. Payment attempts and
-- refunds are intentionally inaccessible with the publishable/anon key.
alter table public.payment_settings enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.refund_requests enable row level security;

revoke all on table public.payment_settings from anon, authenticated;
grant select, update on table public.payment_settings to anon, authenticated;
revoke all on table public.payment_attempts from anon, authenticated;
revoke all on table public.refund_requests from anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payment_settings' and policyname='Public can read payment settings') then
    create policy "Public can read payment settings" on public.payment_settings
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payment_settings' and policyname='Cafe staff can update payment settings') then
    create policy "Cafe staff can update payment settings" on public.payment_settings
      for update to anon, authenticated using (id = 1) with check (id = 1);
  end if;
end $$;

-- Prevent accidental staff updates from turning an unpaid online order into a
-- production order or manually changing Stripe-owned payment fields.
create or replace function public.guard_order_payment_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.payment_method in ('card','apple_pay','google_pay')
     and old.payment_status <> 'paid'
     and new.status is distinct from old.status then
    raise exception 'An unpaid online-payment order cannot be advanced';
  end if;

  if current_user in ('anon','authenticated') and (
    new.payment_status is distinct from old.payment_status or
    new.payment_method is distinct from old.payment_method or
    new.amount_paid_cents is distinct from old.amount_paid_cents or
    new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id or
    new.payment_reference is distinct from old.payment_reference or
    new.paid_at is distinct from old.paid_at or
    new.refunded_at is distinct from old.refunded_at
  ) then
    raise exception 'Payment state can only be changed by the secure payment backend';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_payment_state on public.orders;
create trigger orders_guard_payment_state
before update on public.orders
for each row execute function public.guard_order_payment_state();

-- Existing status-only permissions remain intact. Explicitly ensure clients
-- cannot write any of the new payment columns directly.
revoke update (payment_method, payment_status, amount_paid_cents,
  stripe_payment_intent_id, payment_reference, paid_at, refunded_at)
on public.orders from anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='payment_settings') then
    alter publication supabase_realtime add table public.payment_settings;
  end if;
end $$;

