-- Multi-Tenant Database Migration
-- Safe and additive: preserves existing Common Ground cafe data as Restaurant #1 ('c0000000-0000-0000-0000-000000000001').

begin;

-- 1. Create restaurants table
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~* '^[a-z0-9-]+$' and char_length(slug) between 2 and 60),
  description text not null default '',
  logo_url text,
  cover_image_url text,
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  timezone text not null default 'Pacific/Auckland',
  currency text not null default 'nzd',
  opening_time time not null default '07:00',
  closing_time time not null default '16:00',
  average_prep_minutes integer not null default 15 check (average_prep_minutes between 1 and 180),
  slot_interval_minutes integer not null default 5 check (slot_interval_minutes between 1 and 60),
  max_orders_per_slot integer not null default 5 check (max_orders_per_slot between 1 and 100),
  click_and_collect_enabled boolean not null default true,
  table_ordering_enabled boolean not null default true,
  pay_at_counter_enabled boolean not null default true,
  card_enabled boolean not null default true,
  apple_pay_enabled boolean not null default true,
  google_pay_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at before update on public.restaurants
for each row execute function public.set_orders_updated_at();

-- 2. Insert Restaurant #1: Common Ground
insert into public.restaurants (
  id, name, slug, description, address, phone, email, timezone, currency,
  opening_time, closing_time, average_prep_minutes, slot_interval_minutes, max_orders_per_slot,
  click_and_collect_enabled, table_ordering_enabled, pay_at_counter_enabled, card_enabled, apple_pay_enabled, google_pay_enabled, is_active
) values (
  'c0000000-0000-0000-0000-000000000001',
  'Common Ground',
  'common-ground',
  'Artisan coffee, bakery items and fresh café favourites.',
  '123 Queen Street, Auckland CBD',
  '+64 9 123 4567',
  'contact@commonground.co.nz',
  'Pacific/Auckland',
  'nzd',
  '07:00', '16:00', 15, 5, 5,
  true, true, true, true, true, true, true
) on conflict (slug) do update set updated_at = now();

-- Copy settings from existing cafe_settings if present
do $$
declare
  v_settings record;
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cafe_settings') then
    select * into v_settings from public.cafe_settings where id = 1;
    if found then
      update public.restaurants
      set opening_time = v_settings.opening_time,
          closing_time = v_settings.closing_time,
          average_prep_minutes = v_settings.average_prep_minutes,
          slot_interval_minutes = v_settings.slot_interval_minutes,
          max_orders_per_slot = v_settings.max_orders_per_slot,
          timezone = v_settings.timezone
      where id = 'c0000000-0000-0000-0000-000000000001';
    end if;
  end if;
end $$;

-- 3. Scope products by restaurant_id
alter table public.products
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.products
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
alter table public.products
  alter column restaurant_id set default 'c0000000-0000-0000-0000-000000000001';
alter table public.products
  alter column restaurant_id set not null;
create index if not exists products_restaurant_id_idx on public.products (restaurant_id, display_order);

-- 4. Scope customisation_groups by restaurant_id
alter table public.customisation_groups
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.customisation_groups
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
alter table public.customisation_groups
  alter column restaurant_id set default 'c0000000-0000-0000-0000-000000000001';
alter table public.customisation_groups
  alter column restaurant_id set not null;
create index if not exists customisation_groups_restaurant_id_idx on public.customisation_groups (restaurant_id, display_order);

-- 5. Scope cafe_tables by restaurant_id
alter table public.cafe_tables
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.cafe_tables
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
alter table public.cafe_tables
  alter column restaurant_id set default 'c0000000-0000-0000-0000-000000000001';
alter table public.cafe_tables
  alter column restaurant_id set not null;
alter table public.cafe_tables drop constraint if exists cafe_tables_code_key;
create unique index if not exists cafe_tables_restaurant_code_idx on public.cafe_tables (restaurant_id, code);
create index if not exists cafe_tables_restaurant_id_idx on public.cafe_tables (restaurant_id, active);

-- 6. Scope orders by restaurant_id
alter table public.orders
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.orders
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
alter table public.orders
  alter column restaurant_id set default 'c0000000-0000-0000-0000-000000000001';
alter table public.orders
  alter column restaurant_id set not null;
create index if not exists orders_restaurant_status_created_idx on public.orders (restaurant_id, status, created_at desc);
create index if not exists orders_restaurant_customer_key_idx on public.orders (restaurant_id, customer_key);

-- 7. Scope promo_codes by restaurant_id
alter table public.promo_codes
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.promo_codes
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
alter table public.promo_codes
  alter column restaurant_id set default 'c0000000-0000-0000-0000-000000000001';
alter table public.promo_codes
  alter column restaurant_id set not null;
alter table public.promo_codes drop constraint if exists promo_codes_code_key;
create unique index if not exists promo_codes_restaurant_code_idx on public.promo_codes (restaurant_id, upper(code));

-- 8. Scope loyalty_settings by restaurant_id
alter table public.loyalty_settings
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.loyalty_settings
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
create unique index if not exists loyalty_settings_restaurant_id_idx on public.loyalty_settings (restaurant_id);

-- 9. Scope customer_loyalty by (restaurant_id, customer_key)
alter table public.customer_loyalty
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
update public.customer_loyalty
  set restaurant_id = 'c0000000-0000-0000-0000-000000000001'
  where restaurant_id is null;
alter table public.customer_loyalty
  alter column restaurant_id set default 'c0000000-0000-0000-0000-000000000001';
alter table public.customer_loyalty
  alter column restaurant_id set not null;
alter table public.customer_loyalty drop constraint if exists customer_loyalty_pkey;
alter table public.customer_loyalty add primary key (restaurant_id, customer_key);

-- 10. Create table_service_requests
create table if not exists public.table_service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.cafe_tables(id) on delete set null,
  table_code text not null,
  table_name text not null,
  request_type text not null check (request_type in ('call_staff', 'water', 'bill')),
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'completed', 'cancelled')),
  customer_key text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists table_service_requests_restaurant_idx
  on public.table_service_requests (restaurant_id, status, created_at desc);

drop trigger if exists service_requests_set_updated_at on public.table_service_requests;
create trigger service_requests_set_updated_at before update on public.table_service_requests
for each row execute function public.set_orders_updated_at();

-- 11. Multi-Tenant Staff Table
create table if not exists public.restaurant_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  display_name text not null default '',
  role text not null check (role in ('super_admin', 'owner', 'manager', 'counter', 'kitchen', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists restaurant_staff_user_restaurant_idx
  on public.restaurant_staff (user_id, coalesce(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create unique index if not exists restaurant_staff_email_restaurant_idx
  on public.restaurant_staff (email, coalesce(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists restaurant_staff_restaurant_idx
  on public.restaurant_staff (restaurant_id);

-- Migrate existing cafe_staff rows
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cafe_staff') then
    insert into public.restaurant_staff (user_id, restaurant_id, email, display_name, role)
    select user_id, 'c0000000-0000-0000-0000-000000000001'::uuid, email, display_name,
      case when role = 'admin' then 'owner' else 'staff' end
    from public.cafe_staff
    on conflict do nothing;
  end if;
end $$;

-- 12. Security & Role Helper Functions
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_restaurant_staff(target_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff
    where user_id = auth.uid()
      and (role = 'super_admin' or restaurant_id = target_restaurant_id)
  );
$$;

create or replace function public.is_restaurant_admin(target_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff
    where user_id = auth.uid()
      and (role = 'super_admin' or (restaurant_id = target_restaurant_id and role in ('owner', 'manager')))
  );
$$;

create or replace function public.is_any_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_cafe_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_any_staff();
$$;

create or replace function public.is_cafe_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff
    where user_id = auth.uid() and role in ('super_admin', 'owner', 'manager')
  );
$$;

-- 13. Multi-Tenant RLS Policies

-- Restaurants RLS
alter table public.restaurants enable row level security;
revoke all on public.restaurants from anon, authenticated;
grant select on public.restaurants to anon, authenticated;
grant insert, update, delete on public.restaurants to authenticated;

drop policy if exists "Public read active restaurants" on public.restaurants;
create policy "Public read active restaurants" on public.restaurants
  for select to anon, authenticated
  using (is_active = true or public.is_restaurant_staff(id));

drop policy if exists "Super admin insert restaurants" on public.restaurants;
create policy "Super admin insert restaurants" on public.restaurants
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "Restaurant admin update restaurant" on public.restaurants;
create policy "Restaurant admin update restaurant" on public.restaurants
  for update to authenticated
  using (public.is_restaurant_admin(id))
  with check (public.is_restaurant_admin(id));

drop policy if exists "Super admin delete restaurants" on public.restaurants;
create policy "Super admin delete restaurants" on public.restaurants
  for delete to authenticated
  using (public.is_super_admin());

-- Restaurant Staff RLS
alter table public.restaurant_staff enable row level security;
revoke all on public.restaurant_staff from anon, authenticated;
grant select, insert, update, delete on public.restaurant_staff to authenticated;

drop policy if exists "Staff read own restaurant staff" on public.restaurant_staff;
create policy "Staff read own restaurant staff" on public.restaurant_staff
  for select to authenticated
  using (public.is_super_admin() or (restaurant_id is not null and public.is_restaurant_staff(restaurant_id)));

drop policy if exists "Admins manage restaurant staff" on public.restaurant_staff;
create policy "Admins manage restaurant staff" on public.restaurant_staff
  for insert to authenticated
  with check (public.is_super_admin() or (restaurant_id is not null and public.is_restaurant_admin(restaurant_id)));

drop policy if exists "Admins edit restaurant staff" on public.restaurant_staff;
create policy "Admins edit restaurant staff" on public.restaurant_staff
  for update to authenticated
  using (public.is_super_admin() or (restaurant_id is not null and public.is_restaurant_admin(restaurant_id)))
  with check (public.is_super_admin() or (restaurant_id is not null and public.is_restaurant_admin(restaurant_id)));

drop policy if exists "Admins delete restaurant staff" on public.restaurant_staff;
create policy "Admins delete restaurant staff" on public.restaurant_staff
  for delete to authenticated
  using (public.is_super_admin() or (restaurant_id is not null and public.is_restaurant_admin(restaurant_id)));

-- Products RLS
drop policy if exists "Authorized staff add menu items" on public.products;
drop policy if exists "Authorized staff edit menu items" on public.products;
drop policy if exists "Authorized staff delete menu items" on public.products;
drop policy if exists "Public can read cafe menu" on public.products;

create policy "Public read products" on public.products
  for select to anon, authenticated
  using (true);

create policy "Staff add products" on public.products
  for insert to authenticated
  with check (public.is_restaurant_staff(restaurant_id));

create policy "Staff edit products" on public.products
  for update to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

create policy "Staff delete products" on public.products
  for delete to authenticated
  using (public.is_restaurant_staff(restaurant_id));

-- Cafe Tables RLS
drop policy if exists "Authorized staff add tables" on public.cafe_tables;
drop policy if exists "Authorized staff update tables" on public.cafe_tables;
drop policy if exists "Authorized staff delete tables" on public.cafe_tables;
drop policy if exists "Public can read tables" on public.cafe_tables;

create policy "Public read tables" on public.cafe_tables
  for select to anon, authenticated
  using (true);

create policy "Staff add tables" on public.cafe_tables
  for insert to authenticated
  with check (public.is_restaurant_staff(restaurant_id));

create policy "Staff update tables" on public.cafe_tables
  for update to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

create policy "Staff delete tables" on public.cafe_tables
  for delete to authenticated
  using (public.is_restaurant_staff(restaurant_id));

-- Customisation Groups RLS
drop policy if exists "Public read customisation groups" on public.customisation_groups;
drop policy if exists "Staff manage customisation groups" on public.customisation_groups;

create policy "Public read customisation groups" on public.customisation_groups
  for select to anon, authenticated
  using (true);

create policy "Staff manage customisation groups" on public.customisation_groups
  for all to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Orders RLS
drop policy if exists "Authorized staff read orders" on public.orders;
drop policy if exists "Authorized staff update order status" on public.orders;

grant update (status, payment_status, payment_method) on public.orders to authenticated;

create policy "Staff read orders" on public.orders
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

create policy "Staff update order status" on public.orders
  for update to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Table Service Requests RLS
alter table public.table_service_requests enable row level security;
revoke all on public.table_service_requests from anon, authenticated;
grant select, insert, update on public.table_service_requests to anon, authenticated;

drop policy if exists "Staff read service requests" on public.table_service_requests;
create policy "Staff read service requests" on public.table_service_requests
  for select to authenticated
  using (public.is_restaurant_staff(restaurant_id));

drop policy if exists "Public insert service requests" on public.table_service_requests;
create policy "Public insert service requests" on public.table_service_requests
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Staff update service requests" on public.table_service_requests;
create policy "Staff update service requests" on public.table_service_requests
  for update to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Promo Codes RLS
drop policy if exists "Public read enabled promos" on public.promo_codes;
drop policy if exists "Staff read all promos" on public.promo_codes;
drop policy if exists "Staff manage promos" on public.promo_codes;

create policy "Public read enabled promos" on public.promo_codes
  for select to anon, authenticated
  using (enabled);

create policy "Staff manage promos" on public.promo_codes
  for all to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- Loyalty Settings RLS
drop policy if exists "Public read loyalty settings" on public.loyalty_settings;
drop policy if exists "Staff manage loyalty settings" on public.loyalty_settings;

create policy "Public read loyalty settings" on public.loyalty_settings
  for select to anon, authenticated
  using (true);

create policy "Staff manage loyalty settings" on public.loyalty_settings
  for all to authenticated
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- 14. RPC Functions (Updated with restaurant scoping)

create or replace function public.finalize_cafe_rewards(
  p_order_id text, p_customer_key text, p_promo_code text, p_items jsonb,
  p_redeem_free_coffee boolean, p_restaurant_id uuid default 'c0000000-0000-0000-0000-000000000001'::uuid
) returns void language plpgsql security definer set search_path='' as $$
declare
  cfg public.loyalty_settings%rowtype;
  loyalty public.customer_loyalty%rowtype;
  promo public.promo_codes%rowtype;
  subtotal integer;
  promo_discount integer := 0;
  free_discount integer := 0;
  final_total integer;
  earned integer := 0;
  coffee_count integer := 0;
  new_stamps integer;
  new_free integer;
  redeemed integer := 0;
begin
  select * into cfg from public.loyalty_settings where restaurant_id = p_restaurant_id;
  if not found then
    cfg.points_per_dollar := 1;
    cfg.coffee_goal := 4;
    cfg.free_coffee_max_cents := 1000;
    cfg.enabled := true;
  end if;

  insert into public.customer_loyalty (restaurant_id, customer_key)
  values (p_restaurant_id, p_customer_key)
  on conflict (restaurant_id, customer_key) do nothing;

  select * into loyalty from public.customer_loyalty
  where restaurant_id = p_restaurant_id and customer_key = p_customer_key for update;

  select coalesce(sum((item->>'unit_price_cents')::integer * (item->>'quantity')::integer), 0),
    coalesce(sum(case when coalesce((item->>'is_coffee')::boolean, false) then (item->>'quantity')::integer else 0 end), 0)
    into subtotal, coffee_count from jsonb_array_elements(p_items) item;

  if p_promo_code is not null then
    select * into promo from public.promo_codes
    where restaurant_id = p_restaurant_id
      and upper(code) = upper(trim(p_promo_code))
      and enabled = true
      and subtotal >= minimum_spend_cents
      and (expires_at is null or expires_at >= now());
    if found then
      promo_discount := case when promo.discount_type = 'percent'
        then floor(subtotal * promo.discount_value / 100)
        else promo.discount_value::integer end;
    end if;
  end if;

  if p_redeem_free_coffee and cfg.enabled and loyalty.free_coffees > 0 and coffee_count > 0 then
    select least(cfg.free_coffee_max_cents, min((item->>'unit_price_cents')::integer)) into free_discount
      from jsonb_array_elements(p_items) item where coalesce((item->>'is_coffee')::boolean, false);
    redeemed := 1;
  end if;

  final_total := greatest(0, subtotal - promo_discount - free_discount);

  if cfg.enabled then
    earned := floor((final_total / 100.0) * cfg.points_per_dollar);
    new_stamps := loyalty.coffee_stamps + coffee_count;
    new_free := loyalty.free_coffees - redeemed + (new_stamps / cfg.coffee_goal);
    new_stamps := mod(new_stamps, cfg.coffee_goal);
    update public.customer_loyalty
    set points = points + earned,
        coffee_stamps = new_stamps,
        free_coffees = new_free,
        updated_at = now()
    where restaurant_id = p_restaurant_id and customer_key = p_customer_key;
  end if;

  update public.orders
  set subtotal_cents = subtotal,
      discount_cents = least(subtotal, promo_discount + free_discount),
      promo_code = case when promo.id is null then null else promo.code end,
      free_coffee_discount_cents = free_discount,
      points_earned = earned,
      points_redeemed = redeemed,
      total_cents = final_total
  where id = p_order_id;
end $$;

create or replace function public.place_cafe_order(
  p_id text, p_customer_name text, p_phone text, p_pickup_time text, p_pickup_slot text, p_items jsonb,
  p_customer_key text, p_promo_code text default null, p_redeem_free_coffee boolean default false,
  p_restaurant_id uuid default 'c0000000-0000-0000-0000-000000000001'::uuid
) returns void language plpgsql security definer set search_path='' as $$
declare
  slot_limit integer;
  slot_count integer;
  target_restaurant public.restaurants%rowtype;
begin
  select * into target_restaurant from public.restaurants where id = p_restaurant_id and is_active = true;
  if not found then raise exception 'Restaurant is currently unavailable'; end if;
  if not target_restaurant.click_and_collect_enabled then raise exception 'Click & Collect is currently paused for this restaurant'; end if;

  if p_pickup_slot is null or p_pickup_slot = '' then raise exception 'Please select a pickup time'; end if;
  perform pg_advisory_xact_lock(hashtext(p_restaurant_id::text || ':' || p_pickup_slot));

  slot_limit := target_restaurant.max_orders_per_slot;
  select count(*) into slot_count from public.orders
  where restaurant_id = p_restaurant_id and pickup_slot = p_pickup_slot;

  if slot_count >= slot_limit then raise exception 'This pickup time has just filled up. Please choose another time.'; end if;

  insert into public.orders(
    id, restaurant_id, customer_name, phone, pickup_time, pickup_slot,
    total_cents, subtotal_cents, status, order_type, customer_key, payment_method, payment_status
  ) values (
    p_id, p_restaurant_id, p_customer_name, p_phone, p_pickup_time, p_pickup_slot,
    0, 0, 'Incoming', 'pickup', p_customer_key, 'pay_at_counter', 'unpaid'
  );
  perform public.insert_cafe_order_items(p_id, p_items);
  perform public.finalize_cafe_rewards(p_id, p_customer_key, p_promo_code, p_items, p_redeem_free_coffee, p_restaurant_id);
end $$;

create or replace function public.place_table_order(
  p_id text, p_table_id uuid, p_order_notes text, p_items jsonb,
  p_customer_key text, p_promo_code text default null, p_redeem_free_coffee boolean default false,
  p_restaurant_id uuid default null
) returns void language plpgsql security definer set search_path='' as $$
declare
  selected_table public.cafe_tables%rowtype;
  target_rest_id uuid;
  target_restaurant public.restaurants%rowtype;
begin
  select * into selected_table from public.cafe_tables where id = p_table_id and active = true;
  if not found then raise exception 'This table is not available'; end if;

  target_rest_id := coalesce(p_restaurant_id, selected_table.restaurant_id, 'c0000000-0000-0000-0000-000000000001'::uuid);
  select * into target_restaurant from public.restaurants where id = target_rest_id and is_active = true;
  if not found then raise exception 'Restaurant is currently unavailable'; end if;
  if not target_restaurant.table_ordering_enabled then raise exception 'Table ordering is currently paused for this restaurant'; end if;

  insert into public.orders(
    id, restaurant_id, customer_name, phone, pickup_time, pickup_slot,
    total_cents, subtotal_cents, status, order_type, table_id, table_code, table_name, order_notes, customer_key,
    payment_method, payment_status
  ) values (
    p_id, target_rest_id, selected_table.display_name, 'Table order', 'Table service', null,
    0, 0, 'Incoming', 'table', selected_table.id, selected_table.code, selected_table.display_name,
    nullif(trim(p_order_notes), ''), p_customer_key, 'pay_at_counter', 'unpaid'
  );
  perform public.insert_cafe_order_items(p_id, p_items);
  perform public.finalize_cafe_rewards(p_id, p_customer_key, p_promo_code, p_items, p_redeem_free_coffee, target_rest_id);
end $$;

create or replace function public.get_customer_orders(
  p_customer_key text,
  p_restaurant_id uuid default null
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(
    to_jsonb(o) || jsonb_build_object(
      'order_items', coalesce((
        select jsonb_agg(to_jsonb(i) order by i.id)
        from public.order_items i where i.order_id = o.id
      ), '[]'::jsonb),
      'restaurant', (
        select jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'phone', r.phone, 'address', r.address)
        from public.restaurants r where r.id = o.restaurant_id
      )
    ) order by o.created_at desc
  ), '[]'::jsonb)
  from public.orders o
  where o.customer_key = p_customer_key
    and (p_restaurant_id is null or o.restaurant_id = p_restaurant_id)
    and p_customer_key ~* '^LOY-[0-9a-f-]{36}$';
$$;

create or replace function public.get_customer_loyalty(
  p_customer_key text,
  p_restaurant_id uuid default 'c0000000-0000-0000-0000-000000000001'::uuid
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object(
      'points', points,
      'coffee_stamps', coffee_stamps,
      'free_coffees', free_coffees
    ) from public.customer_loyalty
    where customer_key = p_customer_key
      and restaurant_id = p_restaurant_id
      and p_customer_key ~* '^LOY-[0-9a-f-]{36}$'
  ), '{"points":0,"coffee_stamps":0,"free_coffees":0}'::jsonb);
$$;

create or replace function public.request_table_service(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_request_type text,
  p_customer_key text,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_table public.cafe_tables%rowtype;
  v_request_id uuid;
  v_recent_count integer;
begin
  select * into v_table from public.cafe_tables
  where id = p_table_id and restaurant_id = p_restaurant_id and active = true;
  if not found then raise exception 'Table not found or not active'; end if;

  select count(*) into v_recent_count from public.table_service_requests
  where restaurant_id = p_restaurant_id
    and table_id = p_table_id
    and request_type = p_request_type
    and status in ('pending', 'acknowledged')
    and created_at > (now() - interval '30 seconds');

  if v_recent_count > 0 then
    raise exception 'Your request has already been sent to staff!';
  end if;

  insert into public.table_service_requests (
    restaurant_id, table_id, table_code, table_name, request_type, status, customer_key, notes
  ) values (
    p_restaurant_id, v_table.id, v_table.code, v_table.display_name, p_request_type, 'pending', p_customer_key, nullif(trim(p_notes), '')
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.update_table_service_status(
  p_request_id uuid,
  p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_req public.table_service_requests%rowtype;
begin
  select * into v_req from public.table_service_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;

  if not public.is_restaurant_staff(v_req.restaurant_id) then
    raise exception 'Unauthorized to update service requests for this restaurant';
  end if;

  if p_status not in ('acknowledged', 'completed', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  update public.table_service_requests
  set status = p_status, updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.authorize_restaurant_staff(
  target_restaurant_id uuid,
  staff_email text,
  staff_display_name text default '',
  staff_role text default 'staff'
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(staff_email));
  target_user_id uuid;
begin
  if not (public.is_super_admin() or public.is_restaurant_admin(target_restaurant_id)) then
    raise exception 'Restaurant administrator or super administrator access required';
  end if;
  if staff_role not in ('owner', 'manager', 'counter', 'kitchen', 'staff') then
    raise exception 'Invalid staff role';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  insert into public.restaurant_staff (user_id, restaurant_id, email, display_name, role)
  values (target_user_id, target_restaurant_id, normalized_email, trim(staff_display_name), staff_role)
  on conflict (email, coalesce(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set
    user_id = coalesce(excluded.user_id, public.restaurant_staff.user_id),
    display_name = excluded.display_name,
    role = excluded.role,
    updated_at = now();
end;
$$;

create or replace function public.claim_first_super_admin()
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or current_email = '' then
    raise exception 'Sign in first';
  end if;
  perform pg_advisory_xact_lock(hashtext('claim_first_super_admin'));
  if exists (select 1 from public.restaurant_staff where role = 'super_admin') then
    raise exception 'Super admin has already been established';
  end if;
  insert into public.restaurant_staff (user_id, restaurant_id, email, display_name, role)
  values (auth.uid(), null, current_email, split_part(current_email, '@', 1), 'super_admin');
end;
$$;

create or replace function public.mark_order_paid(
  p_order_id text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;

  if not public.is_restaurant_staff(v_order.restaurant_id) then
    raise exception 'Unauthorized to manage orders for this restaurant';
  end if;

  update public.orders
  set payment_status = 'paid',
      amount_paid_cents = total_cents,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = p_order_id;
end;
$$;

-- Grant execution permissions
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_restaurant_staff(uuid) to authenticated;
grant execute on function public.is_restaurant_admin(uuid) to authenticated;
grant execute on function public.is_any_staff() to authenticated;
grant execute on function public.is_cafe_staff() to authenticated;
grant execute on function public.is_cafe_admin() to authenticated;
grant execute on function public.place_cafe_order(text,text,text,text,text,jsonb,text,text,boolean,uuid) to anon, authenticated;
grant execute on function public.place_table_order(text,uuid,text,jsonb,text,text,boolean,uuid) to anon, authenticated;
grant execute on function public.get_customer_orders(text,uuid) to anon, authenticated;
grant execute on function public.get_customer_loyalty(text,uuid) to anon, authenticated;
grant execute on function public.request_table_service(uuid,uuid,text,text,text) to anon, authenticated;
grant execute on function public.update_table_service_status(uuid,text) to authenticated;
grant execute on function public.authorize_restaurant_staff(uuid,text,text,text) to authenticated;
grant execute on function public.claim_first_super_admin() to authenticated;
grant execute on function public.mark_order_paid(text) to authenticated;

-- 15. Realtime publication additions
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurants') then
    alter publication supabase_realtime add table public.restaurants;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'table_service_requests') then
    alter publication supabase_realtime add table public.table_service_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurant_staff') then
    alter publication supabase_realtime add table public.restaurant_staff;
  end if;
end $$;

commit;
