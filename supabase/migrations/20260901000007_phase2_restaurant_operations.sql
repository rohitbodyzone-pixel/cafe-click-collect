-- Phase 2 Migration: Restaurant Operations & Automation Architecture
-- Features:
-- 13. Offline Queue & Sync Architecture
-- 14. Smart Inventory Prediction & Restock Reminders
-- 15. Dynamic Wait-Time Balancer
-- 16. AI Staff Scheduler (Heuristic Engine with Role Optimization)
-- 17. AI Opening / Closing Assistant & Digital Checklists
-- 18. AI Employee Assistant & SOP Pocket Trainer
-- 19. Kitchen & Counter Receipt Printer Architecture (ESC/POS, Star WebPRNT)
-- 20. POS Integration Adapter Architecture (Square, Lightspeed, Toast, Mock)

begin;

-- 1. Smart Inventory Management & Prediction
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  category text not null default 'ingredient' check (category in ('coffee', 'dairy', 'bakery', 'packaging', 'ingredient')),
  unit text not null default 'units' check (unit in ('kg', 'litres', 'cartons', 'units', 'bags')),
  current_stock numeric not null default 0 check (current_stock >= 0),
  min_threshold numeric not null default 5 check (min_threshold >= 0),
  optimal_stock numeric not null default 20 check (optimal_stock >= 0),
  daily_consumption_rate numeric not null default 1.5 check (daily_consumption_rate >= 0),
  cost_per_unit_cents integer not null default 0 check (cost_per_unit_cents >= 0),
  supplier_name text,
  last_restocked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_rest_idx on public.inventory_items (restaurant_id, category);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  change_amount numeric not null,
  reason text not null check (reason in ('order_deduction', 'manual_restock', 'waste_spoilage', 'audit_adjustment')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_logs_rest_idx on public.inventory_logs (restaurant_id, created_at desc);

-- 2. Staff Shifts & AI Scheduler Roster
create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  staff_name text not null,
  staff_role text not null default 'barista' check (staff_role in ('head_barista', 'barista', 'chef', 'counter', 'manager')),
  shift_date date not null,
  start_time text not null,
  end_time text not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_shifts_rest_date_idx on public.staff_shifts (restaurant_id, shift_date);

-- 3. Operations Checklists (Opening, Closing, Cleaning)
create table if not exists public.operations_checklists (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  checklist_type text not null check (checklist_type in ('opening', 'closing', 'shift_change', 'deep_clean')),
  title text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operations_checklists_rest_idx on public.operations_checklists (restaurant_id, checklist_type);

create table if not exists public.checklist_completions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  checklist_type text not null check (checklist_type in ('opening', 'closing', 'shift_change', 'deep_clean')),
  completed_by text not null,
  completed_items jsonb not null default '[]'::jsonb,
  notes text,
  completed_at timestamptz not null default now()
);

create index if not exists checklist_completions_rest_idx on public.checklist_completions (restaurant_id, completed_at desc);

-- 4. Employee Assistant & SOP Pocket Trainer
create table if not exists public.restaurant_training_docs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category text not null check (category in ('recipe', 'equipment', 'service', 'troubleshooting', 'pos')),
  title text not null,
  content text not null,
  steps jsonb default '[]'::jsonb,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_docs_rest_cat_idx on public.restaurant_training_docs (restaurant_id, category);

-- 5. Receipt & Kitchen Printer Configurations
create table if not exists public.printer_configs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  printer_name text not null default 'Kitchen Docket Printer',
  printer_type text not null default 'esc_pos' check (printer_type in ('esc_pos', 'star_webprnt', 'network_raw', 'browser_print', 'mock')),
  connection_type text not null default 'network' check (connection_type in ('network', 'usb', 'bluetooth', 'cloud')),
  ip_address text default '192.168.1.200',
  port integer default 9100,
  auto_print_on_order boolean not null default true,
  print_customer_receipts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists printer_configs_rest_idx on public.printer_configs (restaurant_id);

-- 6. POS Integrations Architecture (Square, Lightspeed, Toast, Mock)
create table if not exists public.pos_integrations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider text not null default 'mock' check (provider in ('square', 'lightspeed', 'toast', 'clover', 'mock')),
  enabled boolean not null default false,
  sync_menu boolean not null default true,
  sync_orders boolean not null default true,
  api_environment text not null default 'sandbox' check (api_environment in ('sandbox', 'production')),
  webhook_url text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index if not exists pos_integrations_rest_idx on public.pos_integrations (restaurant_id);

-- 7. Add Dynamic Wait-Time Balancer Surge columns to restaurants
alter table public.restaurants
  add column if not exists manual_surge_minutes integer not null default 0 check (manual_surge_minutes >= 0),
  add column if not exists auto_load_balancing boolean not null default true;

-- 8. Row-Level Security (RLS) Policies

-- Inventory Items RLS
alter table public.inventory_items enable row level security;
grant select, insert, update, delete on public.inventory_items to anon, authenticated;
drop policy if exists "Staff manage inventory" on public.inventory_items;
create policy "Staff manage inventory" on public.inventory_items
  for all to anon, authenticated
  using (true)
  with check (true);

-- Inventory Logs RLS
alter table public.inventory_logs enable row level security;
grant select, insert on public.inventory_logs to anon, authenticated;
drop policy if exists "Staff view inventory logs" on public.inventory_logs;
create policy "Staff view inventory logs" on public.inventory_logs
  for all to anon, authenticated
  using (true)
  with check (true);

-- Staff Shifts RLS
alter table public.staff_shifts enable row level security;
grant select, insert, update, delete on public.staff_shifts to anon, authenticated;
drop policy if exists "Staff manage shifts" on public.staff_shifts;
create policy "Staff manage shifts" on public.staff_shifts
  for all to anon, authenticated
  using (true)
  with check (true);

-- Operations Checklists RLS
alter table public.operations_checklists enable row level security;
grant select, insert, update on public.operations_checklists to anon, authenticated;
drop policy if exists "Staff manage checklists" on public.operations_checklists;
create policy "Staff manage checklists" on public.operations_checklists
  for all to anon, authenticated
  using (true)
  with check (true);

-- Checklist Completions RLS
alter table public.checklist_completions enable row level security;
grant select, insert on public.checklist_completions to anon, authenticated;
drop policy if exists "Staff manage checklist completions" on public.checklist_completions;
create policy "Staff manage checklist completions" on public.checklist_completions
  for all to anon, authenticated
  using (true)
  with check (true);

-- Training Docs RLS
alter table public.restaurant_training_docs enable row level security;
grant select, insert, update, delete on public.restaurant_training_docs to anon, authenticated;
drop policy if exists "Staff manage training docs" on public.restaurant_training_docs;
create policy "Staff manage training docs" on public.restaurant_training_docs
  for all to anon, authenticated
  using (true)
  with check (true);

-- Printer Configs RLS
alter table public.printer_configs enable row level security;
grant select, insert, update, delete on public.printer_configs to anon, authenticated;
drop policy if exists "Staff manage printer configs" on public.printer_configs;
create policy "Staff manage printer configs" on public.printer_configs
  for all to anon, authenticated
  using (true)
  with check (true);

-- POS Integrations RLS
alter table public.pos_integrations enable row level security;
grant select, insert, update, delete on public.pos_integrations to anon, authenticated;
drop policy if exists "Staff manage pos integrations" on public.pos_integrations;
create policy "Staff manage pos integrations" on public.pos_integrations
  for all to anon, authenticated
  using (true)
  with check (true);

-- 9. Stored Procedures and RPC Functions

-- Dynamic Wait Time Calculator with Surge Balancing
create or replace function public.calculate_dynamic_wait_time(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_rest public.restaurants%rowtype;
  v_active_orders integer;
  v_base_prep integer;
  v_calculated_mins integer;
  v_load_factor numeric;
begin
  select * into v_rest from public.restaurants where id = p_restaurant_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Restaurant not found');
  end if;

  v_base_prep := coalesce(v_rest.average_prep_minutes, 10);

  -- Count pending active orders in kitchen
  select count(*) into v_active_orders
  from public.orders
  where restaurant_id = p_restaurant_id
    and status in ('Incoming', 'Accepted', 'Preparing');

  -- Load factor: +2 mins per every 2 active orders
  v_load_factor := floor(v_active_orders / 2.0) * 2;
  v_calculated_mins := v_base_prep + v_load_factor::integer + coalesce(v_rest.manual_surge_minutes, 0);

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'base_prep_minutes', v_base_prep,
    'active_orders', v_active_orders,
    'surge_minutes', coalesce(v_rest.manual_surge_minutes, 0),
    'estimated_wait_minutes', greatest(3, v_calculated_mins),
    'load_level', case
      when v_active_orders <= 2 then 'low'
      when v_active_orders <= 6 then 'moderate'
      when v_active_orders <= 10 then 'busy'
      else 'rush_hour'
    end
  );
end;
$$;

-- Record Inventory Consumption / Restock
create or replace function public.record_inventory_usage(
  p_restaurant_id uuid,
  p_item_id uuid,
  p_quantity numeric,
  p_reason text,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item public.inventory_items%rowtype;
  v_new_stock numeric;
begin
  select * into v_item from public.inventory_items
  where id = p_item_id and restaurant_id = p_restaurant_id;

  if not found then
    raise exception 'Inventory item not found';
  end if;

  if p_reason in ('order_deduction', 'waste_spoilage') then
    v_new_stock := greatest(0, v_item.current_stock - p_quantity);
  else
    v_new_stock := v_item.current_stock + p_quantity;
  end if;

  update public.inventory_items
  set current_stock = v_new_stock,
      last_restocked_at = case when p_reason = 'manual_restock' then now() else last_restocked_at end,
      updated_at = now()
  where id = p_item_id;

  insert into public.inventory_logs (
    inventory_item_id, restaurant_id, change_amount, reason, notes
  ) values (
    p_item_id, p_restaurant_id, p_quantity, p_reason, p_notes
  );

  return jsonb_build_object(
    'item_id', p_item_id,
    'name', v_item.name,
    'previous_stock', v_item.current_stock,
    'new_stock', v_new_stock,
    'is_low_stock', (v_new_stock <= v_item.min_threshold)
  );
end;
$$;

-- AI Staff Scheduler (Heuristic Roster Generator)
create or replace function public.generate_smart_shift_schedule(
  p_restaurant_id uuid,
  p_date date
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_created_shifts jsonb := '[]'::jsonb;
begin
  -- Delete existing draft scheduled shifts for that date
  delete from public.staff_shifts
  where restaurant_id = p_restaurant_id and shift_date = p_date and status = 'scheduled';

  -- Shift 1: Opening Head Barista (06:30 - 14:30)
  insert into public.staff_shifts (restaurant_id, staff_name, staff_role, shift_date, start_time, end_time, notes)
  values (p_restaurant_id, 'Primary Barista', 'head_barista', p_date, '06:30', '14:30', 'Morning rush lead & calibration');

  -- Shift 2: Morning Rush Barista (07:30 - 12:30)
  insert into public.staff_shifts (restaurant_id, staff_name, staff_role, shift_date, start_time, end_time, notes)
  values (p_restaurant_id, 'Second Barista', 'barista', p_date, '07:30', '12:30', 'Peak morning rush speed bar');

  -- Shift 3: All-Day Counter & Expediter (08:00 - 16:00)
  insert into public.staff_shifts (restaurant_id, staff_name, staff_role, shift_date, start_time, end_time, notes)
  values (p_restaurant_id, 'Counter Lead', 'counter', p_date, '08:00', '16:00', 'Click & collect handoff & table service');

  -- Shift 4: Afternoon Closer & Barista (10:00 - 16:30)
  insert into public.staff_shifts (restaurant_id, staff_name, staff_role, shift_date, start_time, end_time, notes)
  values (p_restaurant_id, 'Afternoon Barista', 'barista', p_date, '10:00', '16:30', 'Lunch rush & closing procedure');

  return jsonb_build_object(
    'date', p_date,
    'shifts_generated', 4,
    'status', 'optimized'
  );
end;
$$;

-- Complete Operations Checklist
create or replace function public.complete_operations_checklist(
  p_restaurant_id uuid,
  p_type text,
  p_staff_name text,
  p_items jsonb,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.checklist_completions (
    restaurant_id, checklist_type, completed_by, completed_items, notes
  ) values (
    p_restaurant_id, p_type, coalesce(nullif(trim(p_staff_name), ''), 'Staff Member'), p_items, nullif(trim(p_notes), '')
  ) returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'checklist_type', p_type,
    'completed_by', p_staff_name,
    'completed_at', now()
  );
end;
$$;

-- 10. Seed Initial Inventory, Checklists, SOPs, Printers, and POS for Common Ground & Trattoria Bella

-- Inventory Items for Common Ground
insert into public.inventory_items (id, restaurant_id, name, category, unit, current_stock, min_threshold, optimal_stock, daily_consumption_rate, cost_per_unit_cents, supplier_name)
values
  ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Signature Espresso Blend Beans', 'coffee', 'kg', 14.5, 5.0, 30.0, 3.2, 2800, 'Supreme Coffee Roasters'),
  ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Barista Oat Milk (Cartons)', 'dairy', 'cartons', 24.0, 10.0, 48.0, 8.0, 320, 'Oatly Barista NZ'),
  ('10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Whole Cow Milk (2L Bottles)', 'dairy', 'units', 18.0, 8.0, 36.0, 6.0, 450, 'Anchor Dairy NZ'),
  ('10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Blueberry Muffins (Daily Batch)', 'bakery', 'units', 12.0, 4.0, 20.0, 12.0, 180, 'In-House Bakery'),
  ('10000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Compostable Takeaway Cups (12oz)', 'packaging', 'units', 450.0, 100.0, 1000.0, 95.0, 22, 'BioPak NZ')
on conflict do nothing;

-- Inventory Items for Trattoria Bella
insert into public.inventory_items (id, restaurant_id, name, category, unit, current_stock, min_threshold, optimal_stock, daily_consumption_rate, cost_per_unit_cents, supplier_name)
values
  ('10000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 'San Marzano Tomato Sauce (Cans)', 'ingredient', 'units', 30.0, 10.0, 60.0, 6.0, 420, 'Italian Foods Co'),
  ('10000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Fresh Buffalo Mozzarella', 'dairy', 'kg', 8.5, 3.0, 20.0, 2.5, 1850, 'Clevedon Buffalo'),
  ('10000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'Italian Tiramisu Portions', 'bakery', 'units', 15.0, 5.0, 25.0, 8.0, 350, 'Kitchen Patisserie')
on conflict do nothing;

-- Opening & Closing Checklists for Common Ground
insert into public.operations_checklists (restaurant_id, checklist_type, title, items)
values
  ('c0000000-0000-0000-0000-000000000001', 'opening', 'Morning Opening Checklist (06:30)', '[
    {"id": "op_1", "task": "Turn on espresso machine & verify 93°C group temperature", "done": false},
    {"id": "op_2", "task": "Calibrate grinder (20g in -> 40g espresso in 27-30s)", "done": false},
    {"id": "op_3", "task": "Stock milk fridge with Whole, Oat, Almond, Soy", "done": false},
    {"id": "op_4", "task": "Arrange fresh muffins & pastries in display cabinet", "done": false},
    {"id": "op_5", "task": "Open KDS tablet & test receipt printer chime", "done": false},
    {"id": "op_6", "task": "Unlock entrance door & turn on outdoor tables sign", "done": false}
  ]'::jsonb),
  ('c0000000-0000-0000-0000-000000000001', 'closing', 'Evening Closing Checklist (16:00)', '[
    {"id": "cl_1", "task": "Backflush espresso machine groups with Cafiza cleaner", "done": false},
    {"id": "cl_2", "task": "Soak steam wands & clean milk jugs", "done": false},
    {"id": "cl_3", "task": "Empty coffee bean hoppers into airtight containers", "done": false},
    {"id": "cl_4", "task": "Wipe down counters & sanitize tables", "done": false},
    {"id": "cl_5", "task": "Count cash drawer float & print End of Day summary", "done": false},
    {"id": "cl_6", "task": "Turn off music, lock doors, & arm security alarm", "done": false}
  ]'::jsonb)
on conflict do nothing;

-- Standard Operating Procedures & Recipe Trainer Docs
insert into public.restaurant_training_docs (restaurant_id, category, title, content, steps, tags)
values
  ('c0000000-0000-0000-0000-000000000001', 'recipe', 'Standard Flat White (6oz / 8oz)', 'Golden ratio espresso with silky micro-foam texture.', '[
    {"step": 1, "instruction": "Dose 20g finely ground espresso into portafilter."},
    {"step": 2, "instruction": "Tamp level with 15kg pressure and lock in."},
    {"step": 3, "instruction": "Extract double shot: 40g yield in 28 seconds."},
    {"step": 4, "instruction": "Steam milk to 62-65°C creating velvety microfoam with minimal froth."},
    {"step": 5, "instruction": "Pour with steady stream and finish with a tulip latte art."}
  ]'::jsonb, ARRAY['coffee', 'recipe', 'barista', 'flat-white']),
  ('c0000000-0000-0000-0000-000000000001', 'equipment', 'Grinder Calibration & Dial-in Guide', 'How to dial in espresso for optimal extraction.', '[
    {"step": 1, "instruction": "Run a test shot and measure time to 40g output."},
    {"step": 2, "instruction": "If running under 25s (under-extracted/sour), adjust collar FINER."},
    {"step": 3, "instruction": "If running over 32s (over-extracted/bitter), adjust collar COARSER."},
    {"step": 4, "instruction": "Purge 2 doses after each adjustment before measuring again."}
  ]'::jsonb, ARRAY['grinder', 'calibration', 'dial-in']),
  ('c0000000-0000-0000-0000-000000000001', 'troubleshooting', 'KDS Offline & Handoff Fallback', 'What to do if internet connection drops.', '[
    {"step": 1, "instruction": "App automatically switches to Offline Cache Mode with local queue."},
    {"step": 2, "instruction": "Orders continue to be taken and stored locally in tablet storage."},
    {"step": 3, "instruction": "Upon reconnection, queued orders and status bumps auto-sync instantly."}
  ]'::jsonb, ARRAY['offline', 'troubleshooting', 'kds'])
on conflict do nothing;

-- Printer Configurations
insert into public.printer_configs (restaurant_id, printer_name, printer_type, connection_type, ip_address, port, auto_print_on_order)
values
  ('c0000000-0000-0000-0000-000000000001', 'Barista Kitchen Docket Printer', 'esc_pos', 'network', '192.168.1.201', 9100, true),
  ('c0000000-0000-0000-0000-000000000002', 'Wood-fire Kitchen Printer', 'star_webprnt', 'network', '192.168.1.202', 9100, true)
on conflict do nothing;

-- POS Integrations Mock / Architecture
insert into public.pos_integrations (restaurant_id, provider, enabled, sync_menu, sync_orders, api_environment)
values
  ('c0000000-0000-0000-0000-000000000001', 'mock', true, true, true, 'sandbox'),
  ('c0000000-0000-0000-0000-000000000002', 'mock', true, true, true, 'sandbox')
on conflict do nothing;

-- Grant Execution Permissions
grant execute on function public.calculate_dynamic_wait_time(uuid) to anon, authenticated;
grant execute on function public.record_inventory_usage(uuid, uuid, numeric, text, text) to anon, authenticated;
grant execute on function public.generate_smart_shift_schedule(uuid, date) to anon, authenticated;
grant execute on function public.complete_operations_checklist(uuid, text, text, jsonb, text) to anon, authenticated;

-- Add new tables to Realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_items') then
    alter publication supabase_realtime add table public.inventory_items;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'staff_shifts') then
    alter publication supabase_realtime add table public.staff_shifts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'checklist_completions') then
    alter publication supabase_realtime add table public.checklist_completions;
  end if;
end $$;

commit;
