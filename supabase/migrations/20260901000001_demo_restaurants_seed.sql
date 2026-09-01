-- Demo Seed Migration: Sets up Restaurant A (Common Ground) & Restaurant B (Trattoria Bella)
-- Provides isolated menus, tables, staff roles, and pickup configurations for testing.

begin;

-- 1. Insert Restaurant B: Trattoria Bella
insert into public.restaurants (
  id, name, slug, description, address, phone, email, timezone, currency,
  opening_time, closing_time, average_prep_minutes, slot_interval_minutes, max_orders_per_slot,
  click_and_collect_enabled, table_ordering_enabled, pay_at_counter_enabled, card_enabled, apple_pay_enabled, google_pay_enabled, is_active
) values (
  'c0000000-0000-0000-0000-000000000002',
  'Trattoria Bella',
  'trattoria-bella',
  'Wood-fired pizza, handmade pasta, Italian espresso and desserts.',
  '45 Victoria Street, Auckland CBD',
  '+64 9 987 6543',
  'ciao@trattoriabella.co.nz',
  'Pacific/Auckland',
  'nzd',
  '11:30', '22:00', 25, 15, 8,
  true, true, true, true, true, true, true
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  address = excluded.address,
  opening_time = excluded.opening_time,
  closing_time = excluded.closing_time,
  average_prep_minutes = excluded.average_prep_minutes,
  slot_interval_minutes = excluded.slot_interval_minutes,
  max_orders_per_slot = excluded.max_orders_per_slot,
  updated_at = now();

-- 2. Restaurant B Products
insert into public.products (id, restaurant_id, name, category, price_cents, description, emoji, sold_out, display_order)
values
  ('tb-macchiato', 'c0000000-0000-0000-0000-000000000002', 'Espresso Macchiato', 'Coffee', 480, 'Double shot espresso marked with velvety foam', '☕', false, 1),
  ('tb-margherita', 'c0000000-0000-0000-0000-000000000002', 'Margherita Pizza', 'Food', 2400, 'San Marzano tomatoes, fresh mozzarella, basil, EVOO', '🍕', false, 2),
  ('tb-tagliatelle', 'c0000000-0000-0000-0000-000000000002', 'Truffle Tagliatelle', 'Food', 2800, 'Handmade pasta, wild mushrooms, parmesan and black truffle sauce', '🍝', false, 3),
  ('tb-tiramisu', 'c0000000-0000-0000-0000-000000000002', 'Classic Tiramisu', 'Bakery', 1400, 'Savoiardi soaked in espresso with mascarpone cream', '🍰', false, 4)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  name = excluded.name,
  price_cents = excluded.price_cents,
  sold_out = excluded.sold_out;

-- 3. Restaurant B Tables
insert into public.cafe_tables (id, restaurant_id, code, display_name, active)
values
  ('b0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000002', 'B10', 'Dining Table 10', true),
  ('b0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000002', 'B11', 'Dining Table 11', true),
  ('b0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000002', 'T20', 'Terrace Table 20', true)
on conflict (restaurant_id, code) do update set
  display_name = excluded.display_name,
  active = excluded.active;

-- 4. Restaurant B Loyalty & Promos
insert into public.loyalty_settings (restaurant_id, points_per_dollar, coffee_goal, free_coffee_max_cents, enabled)
values ('c0000000-0000-0000-0000-000000000002', 2, 5, 600, true)
on conflict (restaurant_id) do update set
  points_per_dollar = excluded.points_per_dollar,
  coffee_goal = excluded.coffee_goal;

insert into public.promo_codes (restaurant_id, code, description, discount_type, discount_value, minimum_spend_cents, enabled)
values ('c0000000-0000-0000-0000-000000000002', 'BELLA15', '15% off first Italian meal', 'percent', 15, 2000, true)
on conflict (restaurant_id, upper(code)) do update set
  discount_value = excluded.discount_value,
  enabled = excluded.enabled;

-- 5. Seed Staff for both restaurants & Super Admin
insert into public.restaurant_staff (restaurant_id, email, display_name, role)
values
  -- Super Admin
  (null, 'superadmin@platform.co.nz', 'Platform Super Admin', 'super_admin'),
  -- Restaurant A (Common Ground) Staff
  ('c0000000-0000-0000-0000-000000000001', 'owner_a@commonground.co.nz', 'Owner Common Ground', 'owner'),
  ('c0000000-0000-0000-0000-000000000001', 'kitchen_a@commonground.co.nz', 'Kitchen Chef A', 'kitchen'),
  -- Restaurant B (Trattoria Bella) Staff
  ('c0000000-0000-0000-0000-000000000002', 'owner_b@trattoriabella.co.nz', 'Owner Trattoria Bella', 'owner'),
  ('c0000000-0000-0000-0000-000000000002', 'counter_b@trattoriabella.co.nz', 'Counter Host B', 'counter')
on conflict do nothing;

commit;
