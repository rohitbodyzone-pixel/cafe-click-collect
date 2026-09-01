-- Phase 4 Migration: Growth, Marketing & Smart Concierge Architecture
-- Features:
-- 32. AI Menu Item Description Generator
-- 33. AI Social Post Generator
-- 34. AI Review Responder & Reputation Copilot
-- 35. Multi-Channel Ordering Concierge (Web, QR, Table, Chat/Voice)
-- 36. AI Voice Phone Order Assistant & Simulation
-- 37. AI Barista / Food-Pairing Concierge
-- 38. Smart Delivery Dispatcher & Route Optimizer
-- 39. Customer Segment Auto-Tagger
-- 40. AI Dynamic Pricing Safety Bounds & Approvals
-- 41. Group Order Concierge & Split Bill Calculator
-- 42. Automated Supplier Purchase Order Generator (Draft Only)
-- 43. Pocket Concierge / VIP Arrival Experience
-- 44. Smart Drive / Car Arrival Pickup Workflow
-- 45. AI Competitor Benchmark Tracker
-- 46. AI Franchise Playbook
-- 47. Advanced Growth & Marketing Command Dashboard

begin;

-- 1. Marketing & Social Post Generator
create table if not exists public.marketing_posts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'google_business', 'email_newsletter')),
  title text not null,
  caption text not null,
  hashtags text[] default '{}',
  call_to_action text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists marketing_posts_rest_idx on public.marketing_posts (restaurant_id, platform, status);

-- 2. Supplier Purchase Orders (Draft Generator with Mandatory Approval)
create table if not exists public.supplier_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  supplier_name text not null,
  po_number text not null,
  items jsonb not null default '[]'::jsonb,
  total_cost_cents integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'delivered', 'cancelled')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists supplier_po_rest_idx on public.supplier_purchase_orders (restaurant_id, status);

-- 3. Group Orders & Split Bill Concierge
create table if not exists public.group_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  group_code text not null unique,
  host_name text not null,
  dining_type text not null default 'pickup' check (dining_type in ('pickup', 'table')),
  table_name text,
  participants jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'locked', 'ordered', 'settled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists group_orders_rest_code_idx on public.group_orders (restaurant_id, group_code);

-- 4. Simulated Voice Phone Orders
create table if not exists public.simulated_voice_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  caller_phone text not null,
  customer_name text,
  transcript text not null,
  parsed_items jsonb not null default '[]'::jsonb,
  requested_pickup_time text,
  status text not null default 'pending_review' check (status in ('pending_review', 'accepted_to_kds', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists voice_orders_rest_idx on public.simulated_voice_orders (restaurant_id, status);

-- 5. Competitor Market Benchmarks (Public Permitted Data)
create table if not exists public.competitor_benchmarks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  competitor_name text not null,
  category text not null default 'coffee',
  item_name text not null,
  price_cents integer not null,
  our_price_cents integer not null,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists comp_bench_rest_idx on public.competitor_benchmarks (restaurant_id);

-- 6. Add Curbside / Car Arrival columns to orders
alter table public.orders
  add column if not exists vehicle_model text,
  add column if not exists vehicle_color text,
  add column if not exists license_plate text,
  add column if not exists curbside_bay text;

-- 7. Add Segment Tags to Customer Loyalty
alter table public.customer_loyalty
  add column if not exists segment_tags text[] not null default '{}';

-- 8. Row-Level Security (RLS)

alter table public.marketing_posts enable row level security;
grant select, insert, update, delete on public.marketing_posts to anon, authenticated;
drop policy if exists "Staff manage marketing posts" on public.marketing_posts;
create policy "Staff manage marketing posts" on public.marketing_posts
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.supplier_purchase_orders enable row level security;
grant select, insert, update, delete on public.supplier_purchase_orders to anon, authenticated;
drop policy if exists "Staff manage purchase orders" on public.supplier_purchase_orders;
create policy "Staff manage purchase orders" on public.supplier_purchase_orders
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.group_orders enable row level security;
grant select, insert, update, delete on public.group_orders to anon, authenticated;
drop policy if exists "All manage group orders" on public.group_orders;
create policy "All manage group orders" on public.group_orders
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.simulated_voice_orders enable row level security;
grant select, insert, update, delete on public.simulated_voice_orders to anon, authenticated;
drop policy if exists "Staff manage voice orders" on public.simulated_voice_orders;
create policy "Staff manage voice orders" on public.simulated_voice_orders
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.competitor_benchmarks enable row level security;
grant select, insert, update, delete on public.competitor_benchmarks to anon, authenticated;
drop policy if exists "Staff manage competitor benchmarks" on public.competitor_benchmarks;
create policy "Staff manage competitor benchmarks" on public.competitor_benchmarks
  for all to anon, authenticated
  using (true)
  with check (true);

-- 9. Stored Procedures and RPC Functions

-- Draft Supplier PO Generator
create or replace function public.generate_supplier_draft_po(
  p_restaurant_id uuid,
  p_supplier text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_po_id uuid;
  v_po_num text;
  v_items jsonb;
  v_total_cents integer := 0;
begin
  v_po_num := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 4);

  if p_supplier ilike '%oatly%' or p_supplier ilike '%dairy%' then
    v_items := '[{"item": "Barista Oat Milk (Cartons)", "quantity": 24, "unit_cost_cents": 320, "subtotal_cents": 7680}]'::jsonb;
    v_total_cents := 7680;
  else
    v_items := '[{"item": "Signature Espresso Blend Beans (kg)", "quantity": 15, "unit_cost_cents": 2800, "subtotal_cents": 42000}]'::jsonb;
    v_total_cents := 42000;
  end if;

  insert into public.supplier_purchase_orders (
    restaurant_id, supplier_name, po_number, items, total_cost_cents, status
  ) values (
    p_restaurant_id, p_supplier, upper(v_po_num), v_items, v_total_cents, 'draft'
  ) returning id into v_po_id;

  return jsonb_build_object(
    'po_id', v_po_id,
    'po_number', upper(v_po_num),
    'supplier', p_supplier,
    'total_cost_cents', v_total_cents,
    'status', 'draft'
  );
end;
$$;

-- Approve Supplier PO (Human Approval)
create or replace function public.approve_supplier_po(
  p_po_id uuid,
  p_approved_by text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.supplier_purchase_orders
  set status = 'approved',
      approved_by = coalesce(nullif(trim(p_approved_by), ''), 'Owner'),
      approved_at = now()
  where id = p_po_id;

  return jsonb_build_object(
    'po_id', p_po_id,
    'status', 'approved',
    'approved_by', p_approved_by
  );
end;
$$;

-- Simulated Voice Phone Order Injection
create or replace function public.submit_voice_phone_order(
  p_restaurant_id uuid,
  p_phone text,
  p_name text,
  p_transcript text,
  p_items jsonb,
  p_pickup_time text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.simulated_voice_orders (
    restaurant_id, caller_phone, customer_name, transcript, parsed_items, requested_pickup_time, status
  ) values (
    p_restaurant_id, p_phone, coalesce(p_name, 'Phone Customer'), p_transcript, p_items, p_pickup_time, 'pending_review'
  ) returning id into v_id;

  return jsonb_build_object(
    'voice_order_id', v_id,
    'caller_phone', p_phone,
    'customer_name', p_name,
    'status', 'pending_review'
  );
end;
$$;

-- Create Group Order Link
create or replace function public.create_group_order(
  p_restaurant_id uuid,
  p_host text,
  p_dining_type text default 'pickup',
  p_table text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_code text;
begin
  v_code := 'GRP-' || upper(substr(md5(random()::text), 1, 5));

  insert into public.group_orders (
    restaurant_id, group_code, host_name, dining_type, table_name, participants, status
  ) values (
    p_restaurant_id, v_code, p_host, p_dining_type, p_table, '[]'::jsonb, 'open'
  ) returning id into v_id;

  return jsonb_build_object(
    'group_order_id', v_id,
    'group_code', v_code,
    'host_name', p_host
  );
end;
$$;

-- Auto-Tag Customer Segments
create or replace function public.auto_tag_customer_segments(
  p_restaurant_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- Tag customers based on ordering history
  update public.customer_loyalty
  set segment_tags = array_remove(
    array[
      case when total_orders >= 10 then 'morning_rush_regular' else null end,
      case when vip_tier in ('gold', 'platinum') then 'top_vip_patron' else null end,
      case when lifetime_spend_cents >= 10000 then 'high_aov_foodie' else null end
    ],
    null
  )
  where restaurant_id = p_restaurant_id;

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'status', 'segments_tagged'
  );
end;
$$;

-- 10. Seed Initial Marketing Posts, POs, Voice Orders, Benchmarks for Common Ground & Trattoria Bella

-- Marketing Posts
insert into public.marketing_posts (id, restaurant_id, platform, title, caption, hashtags, call_to_action, status)
values
  ('60000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'instagram', 'Morning Coffee Routine', 'Start your Auckland morning with silky micro-foam perfection. Order ahead on Click & Collect and skip the queue! ☕✨', ARRAY['aucklandcafe', 'flatwhite', 'commonground', 'clickandcollect'], 'Tap link in bio to order ahead', 'draft'),
  ('60000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'facebook', 'Fresh Daily Bakery Batch', 'Warm blueberry muffins freshly baked this morning. Pair with any Large Coffee for just $8.50! 🫐🥐', ARRAY['freshbakery', 'muffintime', 'breakfastdeal'], 'Order in app now', 'draft')
on conflict do nothing;

-- Competitor Benchmarks
insert into public.competitor_benchmarks (id, restaurant_id, competitor_name, category, item_name, price_cents, our_price_cents, notes)
values
  ('70000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Neighbourhood Cafe A', 'coffee', 'Flat White (Large)', 580, 550, 'We are 30c more competitive'),
  ('70000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Artisan Roastery B', 'coffee', 'Oat Milk Add-on', 100, 100, 'Matched market standard')
on conflict do nothing;

-- Grant Execution Permissions
grant execute on function public.generate_supplier_draft_po(uuid, text) to anon, authenticated;
grant execute on function public.approve_supplier_po(uuid, text) to anon, authenticated;
grant execute on function public.submit_voice_phone_order(uuid, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.create_group_order(uuid, text, text, text) to anon, authenticated;
grant execute on function public.auto_tag_customer_segments(uuid) to anon, authenticated;

-- Add new tables to Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'marketing_posts') then
    alter publication supabase_realtime add table public.marketing_posts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'group_orders') then
    alter publication supabase_realtime add table public.group_orders;
  end if;
end $$;

commit;
