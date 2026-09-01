-- Phase 1 Migration: Advanced Customer & Loyalty Architecture
-- Features:
-- 1. My Usual / One-Tap Reorder
-- 2. Smart Add-on & Combo Suggestions
-- 3. Review Shield / Customer Recovery
-- 4. Prepaid Coffee & Meal Passes
-- 5. VIP Regular Customer Mode & Lifetime Spend
-- 6. Streak Rewards & Habit Engine
-- 7. Customer Arrival / Curbside Alert
-- 8. Live Queue Position calculation

begin;

-- 1. Customer Usual / One-Tap Reorder
create table if not exists public.customer_usuals (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_key text not null,
  name text not null default 'My Usual',
  items jsonb not null default '[]'::jsonb,
  order_type text not null default 'pickup' check (order_type in ('pickup', 'table')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, customer_key)
);

create index if not exists customer_usuals_rest_cust_idx on public.customer_usuals (restaurant_id, customer_key);

-- 2. Smart Add-on & Upsell Rules
create table if not exists public.smart_upsell_rules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  trigger_category text not null default 'Coffee',
  suggested_product_id text not null references public.products(id) on delete cascade,
  discount_percent integer not null default 10 check (discount_percent between 0 and 100),
  title text not null default 'Pair with a freshly baked treat',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists smart_upsell_rest_idx on public.smart_upsell_rules (restaurant_id, active);

-- 3. Review Shield & Customer Recovery
create table if not exists public.customer_feedback_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  customer_key text not null,
  rating integer not null check (rating between 1 and 5),
  feedback_text text,
  recovery_promo_code text,
  status text not null default 'pending' check (status in ('pending', 'recovered', 'public_prompted', 'resolved')),
  manager_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_feedback_rest_idx on public.customer_feedback_reviews (restaurant_id, created_at desc);

-- 4. Prepaid Coffee & Meal Passes
create table if not exists public.prepaid_pass_templates (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text not null default '',
  pass_type text not null default 'coffee' check (pass_type in ('coffee', 'meal', 'value')),
  total_units integer not null check (total_units > 0),
  price_cents integer not null check (price_cents >= 0),
  bonus_units integer not null default 0 check (bonus_units >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_prepaid_passes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_key text not null,
  template_id uuid references public.prepaid_pass_templates(id) on delete set null,
  pass_name text not null,
  units_total integer not null check (units_total > 0),
  units_remaining integer not null check (units_remaining >= 0),
  status text not null default 'active' check (status in ('active', 'exhausted', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_passes_rest_cust_idx on public.customer_prepaid_passes (restaurant_id, customer_key, status);

-- 5. Extend customer_loyalty for VIP regular tiers and Streaks
alter table public.customer_loyalty
  add column if not exists vip_tier text not null default 'standard' check (vip_tier in ('standard', 'bronze', 'silver', 'gold', 'platinum')),
  add column if not exists lifetime_spend_cents integer not null default 0 check (lifetime_spend_cents >= 0),
  add column if not exists total_orders integer not null default 0 check (total_orders >= 0),
  add column if not exists current_streak_days integer not null default 0 check (current_streak_days >= 0),
  add column if not exists longest_streak_days integer not null default 0 check (longest_streak_days >= 0),
  add column if not exists last_order_date date,
  add column if not exists streak_bonus_unlocked boolean not null default false;

-- 6. Extend orders with Customer Arrival Alert
alter table public.orders
  add column if not exists customer_arrived_at timestamptz,
  add column if not exists arrival_note text,
  add column if not exists is_priority_vip boolean not null default false;

-- 7. RLS Policies for Phase 1 Tables

-- Customer Usuals RLS
alter table public.customer_usuals enable row level security;
revoke all on public.customer_usuals from anon, authenticated;
grant select, insert, update, delete on public.customer_usuals to anon, authenticated;

drop policy if exists "Customer manage own usual" on public.customer_usuals;
create policy "Customer manage own usual" on public.customer_usuals
  for all to anon, authenticated
  using (true)
  with check (true);

-- Smart Upsell Rules RLS
alter table public.smart_upsell_rules enable row level security;
revoke all on public.smart_upsell_rules from anon, authenticated;
grant select on public.smart_upsell_rules to anon, authenticated;
grant insert, update, delete on public.smart_upsell_rules to authenticated;

drop policy if exists "Public read active upsells" on public.smart_upsell_rules;
create policy "Public read active upsells" on public.smart_upsell_rules
  for select to anon, authenticated
  using (active = true or public.is_restaurant_staff(restaurant_id));

drop policy if exists "Staff manage upsells" on public.smart_upsell_rules;
create policy "Staff manage upsells" on public.smart_upsell_rules
  for all to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Customer Feedback Reviews RLS
alter table public.customer_feedback_reviews enable row level security;
revoke all on public.customer_feedback_reviews from anon, authenticated;
grant select, insert on public.customer_feedback_reviews to anon, authenticated;
grant update, delete on public.customer_feedback_reviews to authenticated;

drop policy if exists "Public insert feedback" on public.customer_feedback_reviews;
create policy "Public insert feedback" on public.customer_feedback_reviews
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Staff read restaurant feedback" on public.customer_feedback_reviews;
create policy "Staff read restaurant feedback" on public.customer_feedback_reviews
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

drop policy if exists "Staff update restaurant feedback" on public.customer_feedback_reviews;
create policy "Staff update restaurant feedback" on public.customer_feedback_reviews
  for update to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Prepaid Pass Templates RLS
alter table public.prepaid_pass_templates enable row level security;
revoke all on public.prepaid_pass_templates from anon, authenticated;
grant select on public.prepaid_pass_templates to anon, authenticated;
grant insert, update, delete on public.prepaid_pass_templates to authenticated;

drop policy if exists "Public read active pass templates" on public.prepaid_pass_templates;
create policy "Public read active pass templates" on public.prepaid_pass_templates
  for select to anon, authenticated
  using (active = true or public.is_restaurant_staff(restaurant_id));

drop policy if exists "Staff manage pass templates" on public.prepaid_pass_templates;
create policy "Staff manage pass templates" on public.prepaid_pass_templates
  for all to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Customer Prepaid Passes RLS
alter table public.customer_prepaid_passes enable row level security;
revoke all on public.customer_prepaid_passes from anon, authenticated;
grant select, insert, update on public.customer_prepaid_passes to anon, authenticated;

drop policy if exists "Customer manage own prepaid passes" on public.customer_prepaid_passes;
create policy "Customer manage own prepaid passes" on public.customer_prepaid_passes
  for all to anon, authenticated
  using (true)
  with check (true);

-- 8. Stored Procedures and RPC Functions

-- Save / Update Customer Usual
create or replace function public.save_customer_usual(
  p_restaurant_id uuid,
  p_customer_key text,
  p_name text,
  p_items jsonb,
  p_order_type text default 'pickup',
  p_notes text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.customer_usuals (
    restaurant_id, customer_key, name, items, order_type, notes, updated_at
  ) values (
    p_restaurant_id, p_customer_key, coalesce(nullif(trim(p_name), ''), 'My Usual'), p_items, coalesce(p_order_type, 'pickup'), nullif(trim(p_notes), ''), now()
  ) on conflict (restaurant_id, customer_key) do update set
    name = excluded.name,
    items = excluded.items,
    order_type = excluded.order_type,
    notes = excluded.notes,
    updated_at = now();
end;
$$;

-- Review Shield: Submit rating & auto-generate recovery discount if <= 3 stars
create or replace function public.submit_review_shield_feedback(
  p_restaurant_id uuid,
  p_order_id text,
  p_customer_key text,
  p_rating integer,
  p_feedback text default ''
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_recovery_code text := null;
  v_status text := 'pending';
  v_result jsonb;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  if p_rating <= 3 then
    -- Generate instant recovery promo code (e.g. RECOVER-XXXX)
    v_recovery_code := 'CARE' || upper(substring(md5(random()::text) from 1 for 4));
    v_status := 'recovered';

    -- Insert one-time recovery promo code with 20% discount
    insert into public.promo_codes (
      restaurant_id, code, description, discount_type, discount_value, minimum_spend_cents, enabled
    ) values (
      p_restaurant_id, v_recovery_code, 'Apology 20% off your next visit', 'percent', 20, 0, true
    ) on conflict (restaurant_id, upper(code)) do nothing;
  else
    v_status := 'public_prompted';
  end if;

  insert into public.customer_feedback_reviews (
    restaurant_id, order_id, customer_key, rating, feedback_text, recovery_promo_code, status
  ) values (
    p_restaurant_id, p_order_id, p_customer_key, p_rating, nullif(trim(p_feedback), ''), v_recovery_code, v_status
  );

  v_result := jsonb_build_object(
    'rating', p_rating,
    'status', v_status,
    'recovery_code', v_recovery_code,
    'prompt_public_review', (p_rating >= 4)
  );

  return v_result;
end;
$$;

-- Customer Arrival Alert
create or replace function public.notify_customer_arrival(
  p_order_id text,
  p_arrival_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
  set customer_arrived_at = now(),
      arrival_note = nullif(trim(p_arrival_note), ''),
      updated_at = now()
  where id = p_order_id;
end;
$$;

-- Live Queue Position Calculator
create or replace function public.get_live_queue_position(
  p_order_id text
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_queue_ahead integer;
  v_estimated_minutes integer;
  v_avg_prep integer;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(average_prep_minutes, 10) into v_avg_prep
  from public.restaurants where id = v_order.restaurant_id;

  if v_order.status in ('Ready', 'Collected', 'Cancelled') then
    return jsonb_build_object(
      'found', true,
      'status', v_order.status,
      'queue_position', 0,
      'orders_ahead', 0,
      'estimated_prep_minutes', 0,
      'is_ready', (v_order.status = 'Ready')
    );
  end if;

  -- Count orders placed earlier that are still in Incoming, Accepted, or Preparing
  select count(*) into v_queue_ahead
  from public.orders
  where restaurant_id = v_order.restaurant_id
    and status in ('Incoming', 'Accepted', 'Preparing')
    and created_at < v_order.created_at;

  v_estimated_minutes := greatest(3, (v_queue_ahead + 1) * ceil(v_avg_prep / 2.0)::integer);

  return jsonb_build_object(
    'found', true,
    'status', v_order.status,
    'queue_position', v_queue_ahead + 1,
    'orders_ahead', v_queue_ahead,
    'estimated_prep_minutes', v_estimated_minutes,
    'is_ready', false
  );
end;
$$;

-- Seed initial Upsell Rules & Prepaid Pass Templates for Restaurant A and Restaurant B
insert into public.smart_upsell_rules (restaurant_id, trigger_category, suggested_product_id, discount_percent, title)
values
  ('c0000000-0000-0000-0000-000000000001', 'Coffee', 'blueberry-muffin', 15, 'Add a Warm Blueberry Muffin (15% OFF)'),
  ('c0000000-0000-0000-0000-000000000002', 'Food', 'tb-tiramisu', 20, 'Add Classic Italian Tiramisu (20% OFF)')
on conflict do nothing;

insert into public.prepaid_pass_templates (id, restaurant_id, name, description, pass_type, total_units, price_cents, bonus_units)
values
  ('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', '5 Coffee Roaster Pass', 'Prepay 5 coffees and get your 6th coffee FREE', 'coffee', 5, 2500, 1),
  ('a0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001', '10 Coffee Connoisseur Pass', 'Prepay 10 coffees and get 2 extra coffees FREE', 'coffee', 10, 4800, 2),
  ('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Bella Lunch Pass (5 Meals)', '5 Wood-fired Pizzas or Pastas for a discounted price', 'meal', 5, 9500, 0)
on conflict do nothing;

-- Grant execution permissions
grant execute on function public.save_customer_usual(uuid, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.submit_review_shield_feedback(uuid, text, text, integer, text) to anon, authenticated;
grant execute on function public.notify_customer_arrival(text, text) to anon, authenticated;
grant execute on function public.get_live_queue_position(text) to anon, authenticated;

-- Add new tables to realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_feedback_reviews') then
    alter publication supabase_realtime add table public.customer_feedback_reviews;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_prepaid_passes') then
    alter publication supabase_realtime add table public.customer_prepaid_passes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_usuals') then
    alter publication supabase_realtime add table public.customer_usuals;
  end if;
end $$;

commit;
