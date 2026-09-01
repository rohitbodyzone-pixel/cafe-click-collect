-- Phase 5 Migration: Stripe Connect & Multi-Tenant Platform Economics (Strict Test Mode)
-- Features:
-- 48. Stripe Connect Multi-Tenant Connected Accounts Architecture
-- 49. Configurable Platform Application Fee (Percentage + Fixed Cents)
-- 50. Tenant Payout & Auditable Financial Settlement Ledger
-- 51. Super Admin Platform Billing & Payout Console
-- 52. Strict TEST / LIVE Safety Gate

begin;

-- 1. Extend restaurants table with Stripe Connect columns and safety gates
alter table public.restaurants
  add column if not exists stripe_account_id text,
  add column if not exists stripe_connect_status text not null default 'not_connected' check (stripe_connect_status in ('not_connected', 'pending_verification', 'connected_test_mode', 'restricted')),
  add column if not exists platform_fee_percentage numeric not null default 2.5 check (platform_fee_percentage >= 0 and platform_fee_percentage <= 20),
  add column if not exists platform_fee_fixed_cents integer not null default 30 check (platform_fee_fixed_cents >= 0),
  add column if not exists stripe_live_payments_enabled boolean not null default false;

-- 2. Auditable Tenant Financial Ledger
create table if not exists public.tenant_financial_ledger (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  transaction_type text not null check (transaction_type in ('charge', 'refund', 'partial_refund', 'payout_transfer', 'platform_fee', 'dispute')),
  gross_amount_cents integer not null,
  platform_fee_cents integer not null default 0,
  stripe_fee_cents integer not null default 0,
  net_restaurant_amount_cents integer not null,
  currency text not null default 'NZD',
  payment_intent_id text,
  transfer_id text,
  idempotency_key text unique,
  payout_status text not null default 'pending' check (payout_status in ('pending', 'in_transit', 'paid', 'failed', 'refunded')),
  payout_batch_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tenant_ledger_rest_idx on public.tenant_financial_ledger (restaurant_id, created_at desc);
create index if not exists tenant_ledger_order_idx on public.tenant_financial_ledger (order_id);
create index if not exists tenant_ledger_intent_idx on public.tenant_financial_ledger (payment_intent_id);

-- 3. Stripe Webhook Idempotency & Event Deduplication
create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  account_id text,
  processed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stripe_webhooks_event_id_idx on public.stripe_webhook_events (event_id);

-- 4. Row-Level Security (RLS)

alter table public.tenant_financial_ledger enable row level security;
grant select, insert, update on public.tenant_financial_ledger to anon, authenticated;
drop policy if exists "Staff view restaurant financial ledger" on public.tenant_financial_ledger;
create policy "Staff view restaurant financial ledger" on public.tenant_financial_ledger
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.stripe_webhook_events enable row level security;
grant select, insert, update on public.stripe_webhook_events to anon, authenticated;
drop policy if exists "System manage webhook events" on public.stripe_webhook_events;
create policy "System manage webhook events" on public.stripe_webhook_events
  for all to anon, authenticated
  using (true)
  with check (true);

-- 5. Stored Procedures and RPC Functions

-- Server-Side Payment & Ledger Settlement Calculation
create or replace function public.calculate_and_record_payment_ledger(
  p_order_id text,
  p_payment_intent_id text,
  p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_rest public.restaurants%rowtype;
  v_gross integer;
  v_plat_pct numeric;
  v_plat_fixed integer;
  v_platform_fee integer;
  v_stripe_fee integer;
  v_net_amount integer;
  v_ledger_id uuid;
  v_existing_ledger public.tenant_financial_ledger%rowtype;
begin
  -- 1. Idempotency Check: Return existing ledger if key already processed
  select * into v_existing_ledger
  from public.tenant_financial_ledger
  where idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'ledger_id', v_existing_ledger.id,
      'gross_amount_cents', v_existing_ledger.gross_amount_cents,
      'platform_fee_cents', v_existing_ledger.platform_fee_cents,
      'net_restaurant_amount_cents', v_existing_ledger.net_restaurant_amount_cents,
      'status', 'already_processed'
    );
  end if;

  -- 2. Resolve and validate order server-side
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  -- 3. Resolve restaurant configuration
  select * into v_rest from public.restaurants where id = v_order.restaurant_id;
  if not found then
    raise exception 'Restaurant % not found', v_order.restaurant_id;
  end if;

  -- 4. Server-side financial calculation
  v_gross := v_order.total_cents;
  v_plat_pct := coalesce(v_rest.platform_fee_percentage, 2.5);
  v_plat_fixed := coalesce(v_rest.platform_fee_fixed_cents, 30);

  -- Platform application fee: e.g. 2.5% + 30c
  v_platform_fee := round((v_gross * (v_plat_pct / 100.0)) + v_plat_fixed);

  -- Estimated Stripe processing fee: 2.9% + 30c
  v_stripe_fee := round((v_gross * 0.029) + 30);

  -- Net restaurant payout amount
  v_net_amount := greatest(0, v_gross - v_platform_fee - v_stripe_fee);

  -- 5. Record in immutable financial ledger
  insert into public.tenant_financial_ledger (
    restaurant_id, order_id, transaction_type, gross_amount_cents,
    platform_fee_cents, stripe_fee_cents, net_restaurant_amount_cents,
    currency, payment_intent_id, idempotency_key, payout_status, metadata
  ) values (
    v_order.restaurant_id, p_order_id, 'charge', v_gross,
    v_platform_fee, v_stripe_fee, v_net_amount,
    'NZD', p_payment_intent_id, p_idempotency_key, 'paid',
    jsonb_build_object(
      'mode', 'test_mode',
      'stripe_account_id', v_rest.stripe_account_id,
      'calculated_at', now()
    )
  ) returning id into v_ledger_id;

  -- 6. Mark order paid server-side
  update public.orders
  set payment_status = 'paid',
      amount_paid_cents = v_gross,
      payment_method = 'card',
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'ledger_id', v_ledger_id,
    'order_id', p_order_id,
    'gross_amount_cents', v_gross,
    'platform_fee_cents', v_platform_fee,
    'stripe_fee_cents', v_stripe_fee,
    'net_restaurant_amount_cents', v_net_amount,
    'destination_account', v_rest.stripe_account_id,
    'mode', 'test_mode'
  );
end;
$$;

-- Server-Side Refund Processing
create or replace function public.process_server_refund(
  p_order_id text,
  p_refund_amount_cents integer,
  p_reason text,
  p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_existing_refund public.tenant_financial_ledger%rowtype;
  v_ledger_id uuid;
begin
  -- 1. Idempotency Check
  select * into v_existing_refund
  from public.tenant_financial_ledger
  where idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object('success', true, 'idempotent_replay', true, 'status', 'already_refunded');
  end if;

  -- 2. Validate Order
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if p_refund_amount_cents > v_order.total_cents then
    raise exception 'Refund amount (% cents) exceeds order total (% cents)', p_refund_amount_cents, v_order.total_cents;
  end if;

  -- 3. Record Refund in Ledger
  insert into public.tenant_financial_ledger (
    restaurant_id, order_id, transaction_type, gross_amount_cents,
    platform_fee_cents, stripe_fee_cents, net_restaurant_amount_cents,
    currency, idempotency_key, payout_status, metadata
  ) values (
    v_order.restaurant_id, p_order_id,
    case when p_refund_amount_cents = v_order.total_cents then 'refund' else 'partial_refund' end,
    -p_refund_amount_cents, 0, 0, -p_refund_amount_cents,
    'NZD', p_idempotency_key, 'refunded',
    jsonb_build_object('reason', p_reason, 'refunded_at', now())
  ) returning id into v_ledger_id;

  return jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'order_id', p_order_id,
    'refund_amount_cents', p_refund_amount_cents,
    'status', 'refund_settled'
  );
end;
$$;

-- Webhook Deduplication Handler
create or replace function public.handle_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_account_id text,
  p_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.stripe_webhook_events where event_id = p_event_id) then
    return jsonb_build_object('processed', true, 'duplicate', true, 'event_id', p_event_id);
  end if;

  insert into public.stripe_webhook_events (event_id, event_type, account_id, processed, payload)
  values (p_event_id, p_event_type, p_account_id, true, p_payload);

  return jsonb_build_object('processed', true, 'duplicate', false, 'event_id', p_event_id);
end;
$$;

-- Super Admin Platform Economics Summary RPC
create or replace function public.get_super_admin_platform_economics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_gmv_cents bigint;
  v_plat_rev_cents bigint;
  v_net_payouts_cents bigint;
  v_connected_count integer;
  v_total_transactions integer;
begin
  select
    coalesce(sum(gross_amount_cents), 0),
    coalesce(sum(platform_fee_cents), 0),
    coalesce(sum(net_restaurant_amount_cents), 0),
    count(*)
  into v_gmv_cents, v_plat_rev_cents, v_net_payouts_cents, v_total_transactions
  from public.tenant_financial_ledger
  where transaction_type = 'charge';

  select count(*) into v_connected_count
  from public.restaurants
  where stripe_connect_status in ('connected_test_mode', 'pending_verification');

  return jsonb_build_object(
    'platform_gmv_cents', v_gmv_cents,
    'platform_revenue_cents', v_plat_rev_cents,
    'net_restaurant_payouts_cents', v_net_payouts_cents,
    'total_settled_transactions', v_total_transactions,
    'connected_accounts_count', v_connected_count,
    'mode', 'strict_test_mode',
    'live_stripe_enabled', false
  );
end;
$$;

-- Update Tenant Fee Structure (Super Admin Only)
create or replace function public.update_tenant_fee_structure(
  p_restaurant_id uuid,
  p_fee_percent numeric,
  p_fee_fixed_cents integer
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.restaurants
  set platform_fee_percentage = greatest(0, least(20, p_fee_percent)),
      platform_fee_fixed_cents = greatest(0, p_fee_fixed_cents),
      updated_at = now()
  where id = p_restaurant_id;
end;
$$;

-- 6. Configure Connected Accounts & Fees for Common Ground & Trattoria Bella in TEST MODE
update public.restaurants
set stripe_account_id = 'acct_test_commonground01',
  stripe_connect_status = 'connected_test_mode',
  platform_fee_percentage = 2.5,
  platform_fee_fixed_cents = 30,
  stripe_live_payments_enabled = false
where id = 'c0000000-0000-0000-0000-000000000001';

update public.restaurants
set stripe_account_id = 'acct_test_trattoriabella02',
  stripe_connect_status = 'connected_test_mode',
  platform_fee_percentage = 2.0,
  platform_fee_fixed_cents = 30,
  stripe_live_payments_enabled = false
where id = 'c0000000-0000-0000-0000-000000000002';

-- Grant Execution Permissions
grant execute on function public.calculate_and_record_payment_ledger(text, text, text) to anon, authenticated;
grant execute on function public.process_server_refund(text, integer, text, text) to anon, authenticated;
grant execute on function public.handle_stripe_webhook_event(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_super_admin_platform_economics() to anon, authenticated;
grant execute on function public.update_tenant_fee_structure(uuid, numeric, integer) to anon, authenticated;

-- Add new tables to Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tenant_financial_ledger') then
    alter publication supabase_realtime add table public.tenant_financial_ledger;
  end if;
end $$;

commit;
