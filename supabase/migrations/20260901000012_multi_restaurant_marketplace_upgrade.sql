-- Migration: Multi-Restaurant Marketplace Upgrade
-- Features:
-- 1. Master Feature Permissions Matrix (Super Admin Feature Manager)
-- 2. Separate Rush / Busy Mode Controls (Wait Time Booster + Order Pause)
-- 3. Kitchen Station Routing (Barista / Kitchen / Bakery / Dessert) & Pickup Codes
-- 4. Test Orders Flag (Excluded from real revenue reports)
-- 5. Menu Drafts & Revision History with Rollback
-- 6. Customer Favorites & Blacklist Controls
-- 7. Marketplace Restaurant Metadata (Cuisine tags, Ratings, Distance)

begin;

-- 1. Master Feature Permissions Table
create table if not exists public.restaurant_feature_permissions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  feature_key text not null,
  category text not null default 'general' check (category in ('ordering', 'operations', 'marketing', 'ai_analytics', 'staff')),
  is_enabled boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  unique (restaurant_id, feature_key)
);

create index if not exists rest_feat_perm_rest_idx on public.restaurant_feature_permissions (restaurant_id, is_enabled);

-- 2. Menu Drafts & Version History Table
create table if not exists public.restaurant_menu_drafts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  version_number integer not null default 1,
  title text not null default 'Menu Snapshot',
  snapshot jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_by text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists menu_drafts_rest_idx on public.restaurant_menu_drafts (restaurant_id, created_at desc);

-- 3. Extend restaurants table with Marketplace & Rush Mode fields
alter table public.restaurants
  add column if not exists is_orders_paused boolean not null default false,
  add column if not exists rush_wait_extra_minutes integer not null default 0 check (rush_wait_extra_minutes >= 0),
  add column if not exists rush_customer_message text default null,
  add column if not exists rush_limited_menu_enabled boolean not null default false,
  add column if not exists cuisine_types text[] not null default '{"Cafe", "Coffee"}',
  add column if not exists rating numeric not null default 4.9,
  add column if not exists distance_km numeric not null default 0.4,
  add column if not exists deals_tag text default null,
  add column if not exists hero_image_url text default null;

-- 4. Extend products table with Station Routing, Featured flag, and Allergens
alter table public.products
  add column if not exists kitchen_station text not null default 'barista' check (kitchen_station in ('barista', 'kitchen', 'bakery', 'dessert')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists calories_kcal integer default null,
  add column if not exists allergens text[] not null default '{}';

-- 5. Extend orders table with Pickup Code, Test Order flag, and Station
alter table public.orders
  add column if not exists pickup_code text default null,
  add column if not exists is_test_order boolean not null default false,
  add column if not exists kitchen_station text not null default 'barista',
  add column if not exists handover_notes text default null,
  add column if not exists ready_photo_url text default null;

-- 6. Extend customer_loyalty with Favorites, Blacklist, and No-Shows
alter table public.customer_loyalty
  add column if not exists favorite_product_ids text[] not null default '{}',
  add column if not exists is_blacklisted boolean not null default false,
  add column if not exists blacklist_reason text default null,
  add column if not exists no_show_count integer not null default 0;

-- 7. Row Level Security (RLS)
alter table public.restaurant_feature_permissions enable row level security;
grant select, insert, update, delete on public.restaurant_feature_permissions to anon, authenticated;
drop policy if exists "All view and manage feature permissions" on public.restaurant_feature_permissions;
create policy "All view and manage feature permissions" on public.restaurant_feature_permissions
  for all to anon, authenticated
  using (true)
  with check (true);

alter table public.restaurant_menu_drafts enable row level security;
grant select, insert, update, delete on public.restaurant_menu_drafts to anon, authenticated;
drop policy if exists "Staff manage menu drafts" on public.restaurant_menu_drafts;
create policy "Staff manage menu drafts" on public.restaurant_menu_drafts
  for all to anon, authenticated
  using (true)
  with check (true);

-- 8. Stored Procedures and RPC Functions

-- Toggle Single Feature Permission (Super Admin)
create or replace function public.toggle_restaurant_feature_permission(
  p_restaurant_id uuid,
  p_feature_key text,
  p_enabled boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  insert into public.restaurant_feature_permissions (restaurant_id, feature_key, is_enabled, updated_at)
  values (p_restaurant_id, p_feature_key, p_enabled, now())
  on conflict (restaurant_id, feature_key)
  do update set is_enabled = p_enabled, updated_at = now();

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'feature_key', p_feature_key,
    'is_enabled', p_enabled
  );
end;
$$;

-- Bulk Toggle Features by Category (Super Admin)
create or replace function public.bulk_toggle_restaurant_features(
  p_restaurant_id uuid,
  p_category text,
  p_enabled boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.restaurant_feature_permissions
  set is_enabled = p_enabled, updated_at = now()
  where restaurant_id = p_restaurant_id and category = p_category;

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'category', p_category,
    'is_enabled', p_enabled
  );
end;
$$;

-- Get Effective Feature List for Restaurant
create or replace function public.get_restaurant_effective_features(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_perms jsonb;
begin
  select jsonb_object_agg(feature_key, is_enabled)
  into v_perms
  from public.restaurant_feature_permissions
  where restaurant_id = p_restaurant_id;

  return coalesce(v_perms, '{}'::jsonb);
end;
$$;

-- Set Rush Mode Controls (Owner / Manager)
create or replace function public.set_restaurant_rush_mode(
  p_restaurant_id uuid,
  p_orders_paused boolean,
  p_extra_minutes integer,
  p_message text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.restaurants
  set is_orders_paused = p_orders_paused,
      rush_wait_extra_minutes = greatest(0, p_extra_minutes),
      rush_customer_message = p_message,
      updated_at = now()
  where id = p_restaurant_id;

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'is_orders_paused', p_orders_paused,
    'rush_wait_extra_minutes', p_extra_minutes,
    'rush_customer_message', p_message
  );
end;
$$;

-- Reopen Order in KDS
create or replace function public.reopen_order_in_kds(
  p_order_id text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
  set status = 'Preparing',
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'Preparing'
  );
end;
$$;

-- Publish Menu Draft Snapshot
create or replace function public.publish_menu_draft(
  p_restaurant_id uuid,
  p_snapshot jsonb,
  p_published_by text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_next_version integer;
  v_draft_id uuid;
begin
  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.restaurant_menu_drafts
  where restaurant_id = p_restaurant_id;

  insert into public.restaurant_menu_drafts (
    restaurant_id, version_number, title, snapshot, status, published_by, published_at
  ) values (
    p_restaurant_id, v_next_version, 'Menu v' || v_next_version, p_snapshot, 'published', p_published_by, now()
  ) returning id into v_draft_id;

  return jsonb_build_object(
    'draft_id', v_draft_id,
    'version_number', v_next_version,
    'status', 'published'
  );
end;
$$;

-- 9. Seed Master Feature Permissions for Common Ground & Trattoria Bella
-- Features across 5 categories:
-- ordering: click_and_collect, table_ordering, pay_at_counter, group_ordering, curbside_pickup
-- operations: rush_mode, kds_station_routing, inventory_tracking, receipt_printers, digital_checklists
-- marketing: loyalty_rewards, prepaid_passes, my_usual, review_shield, social_copywriter, competitor_benchmarks
-- ai_analytics: demand_prediction, health_score, menu_bcg_matrix, price_optimizer, ai_copilot, restaurant_memory
-- staff: staff_roster, training_sops, staff_pin_auth, handover_notes

insert into public.restaurant_feature_permissions (restaurant_id, feature_key, category, is_enabled, notes)
values
  -- Common Ground (All enabled)
  ('c0000000-0000-0000-0000-000000000001', 'click_and_collect', 'ordering', true, 'Click & Collect pre-ordering'),
  ('c0000000-0000-0000-0000-000000000001', 'table_ordering', 'ordering', true, 'QR Table Ordering at seats'),
  ('c0000000-0000-0000-0000-000000000001', 'pay_at_counter', 'ordering', true, 'Cash & EFTPOS at counter'),
  ('c0000000-0000-0000-0000-000000000001', 'group_ordering', 'ordering', true, 'Group ordering & split bill links'),
  ('c0000000-0000-0000-0000-000000000001', 'curbside_pickup', 'ordering', true, 'Smart Car / Drive arrival'),
  ('c0000000-0000-0000-0000-000000000001', 'rush_mode', 'operations', true, 'Rush mode wait time & order pause'),
  ('c0000000-0000-0000-0000-000000000001', 'kds_station_routing', 'operations', true, 'Station routing to barista/kitchen'),
  ('c0000000-0000-0000-0000-000000000001', 'inventory_tracking', 'operations', true, 'Smart inventory depletion & POs'),
  ('c0000000-0000-0000-0000-000000000001', 'receipt_printers', 'operations', true, 'ESC/POS and Star WebPRNT dockets'),
  ('c0000000-0000-0000-0000-000000000001', 'digital_checklists', 'operations', true, 'Opening and closing checklists'),
  ('c0000000-0000-0000-0000-000000000001', 'loyalty_rewards', 'marketing', true, 'Digital stamp cards and streaks'),
  ('c0000000-0000-0000-0000-000000000001', 'prepaid_passes', 'marketing', true, 'Prepaid coffee and meal passes'),
  ('c0000000-0000-0000-0000-000000000001', 'my_usual', 'marketing', true, '1-tap favorite reordering'),
  ('c0000000-0000-0000-0000-000000000001', 'review_shield', 'marketing', true, 'Customer feedback recovery voucher'),
  ('c0000000-0000-0000-0000-000000000001', 'social_copywriter', 'marketing', true, 'AI social caption generator'),
  ('c0000000-0000-0000-0000-000000000001', 'demand_prediction', 'ai_analytics', true, '24-hour hourly demand forecast'),
  ('c0000000-0000-0000-0000-000000000001', 'health_score', 'ai_analytics', true, 'Restaurant Health Score (0-100)'),
  ('c0000000-0000-0000-0000-000000000001', 'menu_bcg_matrix', 'ai_analytics', true, 'Menu Optimizer BCG matrix'),
  ('c0000000-0000-0000-0000-000000000001', 'price_optimizer', 'ai_analytics', true, 'Margin & profit recommendations'),
  ('c0000000-0000-0000-0000-000000000001', 'ai_copilot', 'ai_analytics', true, 'Daily operational briefing copilot'),
  ('c0000000-0000-0000-0000-000000000001', 'staff_roster', 'staff', true, 'AI staff scheduling & shifts'),
  ('c0000000-0000-0000-0000-000000000001', 'training_sops', 'staff', true, 'Barista training SOP library'),

  -- Trattoria Bella (All enabled)
  ('c0000000-0000-0000-0000-000000000002', 'click_and_collect', 'ordering', true, 'Click & Collect pre-ordering'),
  ('c0000000-0000-0000-0000-000000000002', 'table_ordering', 'ordering', true, 'QR Table Ordering at seats'),
  ('c0000000-0000-0000-0000-000000000002', 'pay_at_counter', 'ordering', true, 'Cash & EFTPOS at counter'),
  ('c0000000-0000-0000-0000-000000000002', 'group_ordering', 'ordering', true, 'Group ordering & split bill links'),
  ('c0000000-0000-0000-0000-000000000002', 'curbside_pickup', 'ordering', true, 'Smart Car / Drive arrival'),
  ('c0000000-0000-0000-0000-000000000002', 'rush_mode', 'operations', true, 'Rush mode wait time & order pause'),
  ('c0000000-0000-0000-0000-000000000002', 'kds_station_routing', 'operations', true, 'Station routing to barista/kitchen'),
  ('c0000000-0000-0000-0000-000000000002', 'inventory_tracking', 'operations', true, 'Smart inventory depletion & POs'),
  ('c0000000-0000-0000-0000-000000000002', 'receipt_printers', 'operations', true, 'ESC/POS and Star WebPRNT dockets'),
  ('c0000000-0000-0000-0000-000000000002', 'digital_checklists', 'operations', true, 'Opening and closing checklists'),
  ('c0000000-0000-0000-0000-000000000002', 'loyalty_rewards', 'marketing', true, 'Digital stamp cards and streaks'),
  ('c0000000-0000-0000-0000-000000000002', 'prepaid_passes', 'marketing', true, 'Prepaid coffee and meal passes'),
  ('c0000000-0000-0000-0000-000000000002', 'my_usual', 'marketing', true, '1-tap favorite reordering'),
  ('c0000000-0000-0000-0000-000000000002', 'review_shield', 'marketing', true, 'Customer feedback recovery voucher'),
  ('c0000000-0000-0000-0000-000000000002', 'social_copywriter', 'marketing', true, 'AI social caption generator'),
  ('c0000000-0000-0000-0000-000000000002', 'demand_prediction', 'ai_analytics', true, '24-hour hourly demand forecast'),
  ('c0000000-0000-0000-0000-000000000002', 'health_score', 'ai_analytics', true, 'Restaurant Health Score (0-100)'),
  ('c0000000-0000-0000-0000-000000000002', 'menu_bcg_matrix', 'ai_analytics', true, 'Menu Optimizer BCG matrix'),
  ('c0000000-0000-0000-0000-000000000002', 'price_optimizer', 'ai_analytics', true, 'Margin & profit recommendations'),
  ('c0000000-0000-0000-0000-000000000002', 'ai_copilot', 'ai_analytics', true, 'Daily operational briefing copilot'),
  ('c0000000-0000-0000-0000-000000000002', 'staff_roster', 'staff', true, 'AI staff scheduling & shifts'),
  ('c0000000-0000-0000-0000-000000000002', 'training_sops', 'staff', true, 'Barista training SOP library')
on conflict (restaurant_id, feature_key) do nothing;

-- 10. Update Restaurant Metadata for Common Ground & Trattoria Bella
update public.restaurants
set cuisine_types = '{"Specialty Coffee", "Artisan Bakery", "Breakfast"}',
    rating = 4.9,
    distance_km = 0.3,
    deals_tag = 'Free Coffee on 5th Order'
where id = 'c0000000-0000-0000-0000-000000000001';

update public.restaurants
set cuisine_types = '{"Italian", "Handmade Pasta", "Woodfired Pizza", "Wine"}',
    rating = 4.8,
    distance_km = 0.8,
    deals_tag = '20% OFF First Dinner Order'
where id = 'c0000000-0000-0000-0000-000000000002';

-- Update product kitchen stations
update public.products set kitchen_station = 'barista' where category ilike '%coffee%' or category ilike '%drinks%';
update public.products set kitchen_station = 'bakery' where category ilike '%bakery%' or category ilike '%pastry%' or category ilike '%muffin%';
update public.products set kitchen_station = 'kitchen' where kitchen_station is null or kitchen_station not in ('barista', 'bakery');

-- Grant Execution Permissions
grant execute on function public.toggle_restaurant_feature_permission(uuid, text, boolean) to anon, authenticated;
grant execute on function public.bulk_toggle_restaurant_features(uuid, text, boolean) to anon, authenticated;
grant execute on function public.get_restaurant_effective_features(uuid) to anon, authenticated;
grant execute on function public.set_restaurant_rush_mode(uuid, boolean, integer, text) to anon, authenticated;
grant execute on function public.reopen_order_in_kds(text) to anon, authenticated;
grant execute on function public.publish_menu_draft(uuid, jsonb, text) to anon, authenticated;

-- Add new tables to Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurant_feature_permissions') then
    alter publication supabase_realtime add table public.restaurant_feature_permissions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurant_menu_drafts') then
    alter publication supabase_realtime add table public.restaurant_menu_drafts;
  end if;
end $$;

commit;
