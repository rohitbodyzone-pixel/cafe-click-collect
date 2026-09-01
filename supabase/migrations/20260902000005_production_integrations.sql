-- Migration: Production Integrations (Receipt Printers, Push Notifications, POS Sync, Digital Wallet Passes)
begin;

-- 1. Restaurant Printer Configuration Table
create table if not exists public.restaurant_printer_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  printer_ip text not null default '192.168.1.200',
  printer_port integer not null default 9100,
  paper_width_mm integer not null default 80,
  auto_print_kitchen_docket boolean not null default true,
  auto_print_customer_receipt boolean not null default false,
  print_station_filter text not null default 'all',
  cut_paper boolean not null default true,
  open_cash_drawer boolean not null default false,
  gst_number text default '123-456-789',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Device Push Tokens Table
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  customer_key text,
  user_id uuid,
  device_token text not null,
  platform text not null default 'web',
  notification_preferences jsonb not null default '{"order_updates": true, "promotions": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_tokens_unique unique (restaurant_id, device_token)
);

create index if not exists device_push_tokens_customer_idx
  on public.device_push_tokens (restaurant_id, customer_key);

-- 3. Restaurant POS Connections Table
create table if not exists public.restaurant_pos_connections (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  provider text not null check (provider in ('square', 'lightspeed', 'toast')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'pending')),
  location_id text,
  sync_menu boolean not null default true,
  sync_orders boolean not null default true,
  last_sync_at timestamptz,
  error_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_pos_connections_unique unique (restaurant_id, provider)
);

-- 4. POS Sync Logs Table
create table if not exists public.pos_sync_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  provider text not null,
  event_type text not null,
  status text not null default 'success',
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists pos_sync_logs_rest_idx
  on public.pos_sync_logs (restaurant_id, created_at desc);

-- 5. Customer Digital Wallet Passes Table
create table if not exists public.customer_wallet_passes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  customer_key text not null,
  pass_type text not null check (pass_type in ('loyalty_card', 'prepaid_pass')),
  serial_number text not null unique,
  apple_pass_url text,
  google_jwt_url text,
  balance_units integer not null default 0,
  points integer not null default 0,
  tier text not null default 'Standard',
  barcode_payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_wallet_passes_cust_idx
  on public.customer_wallet_passes (restaurant_id, customer_key, pass_type);

-- 6. RLS & Permissions
alter table public.restaurant_printer_settings enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.restaurant_pos_connections enable row level security;
alter table public.pos_sync_logs enable row level security;
alter table public.customer_wallet_passes enable row level security;

grant select, insert, update on public.restaurant_printer_settings to anon, authenticated;
grant select, insert, update on public.device_push_tokens to anon, authenticated;
grant select, insert, update on public.restaurant_pos_connections to anon, authenticated;
grant select, insert, update on public.pos_sync_logs to anon, authenticated;
grant select, insert, update on public.customer_wallet_passes to anon, authenticated;

-- Public read / write policies for demo and staff
drop policy if exists "Printer settings policy" on public.restaurant_printer_settings;
create policy "Printer settings policy" on public.restaurant_printer_settings for all to anon, authenticated using (true) with check (true);

drop policy if exists "Push tokens policy" on public.device_push_tokens;
create policy "Push tokens policy" on public.device_push_tokens for all to anon, authenticated using (true) with check (true);

drop policy if exists "POS connections policy" on public.restaurant_pos_connections;
create policy "POS connections policy" on public.restaurant_pos_connections for all to anon, authenticated using (true) with check (true);

drop policy if exists "POS sync logs policy" on public.pos_sync_logs;
create policy "POS sync logs policy" on public.pos_sync_logs for all to anon, authenticated using (true) with check (true);

drop policy if exists "Wallet passes policy" on public.customer_wallet_passes;
create policy "Wallet passes policy" on public.customer_wallet_passes for all to anon, authenticated using (true) with check (true);

-- 7. Seed Initial Printer and POS records for active restaurants
do $$
declare
  v_rest record;
begin
  for v_rest in select id from public.restaurants loop
    insert into public.restaurant_printer_settings (restaurant_id, printer_ip, gst_number)
    values (v_rest.id, '192.168.1.200', '134-889-012')
    on conflict (restaurant_id) do nothing;

    insert into public.restaurant_pos_connections (restaurant_id, provider, status)
    values (v_rest.id, 'square', 'disconnected')
    on conflict (restaurant_id, provider) do nothing;

    insert into public.restaurant_pos_connections (restaurant_id, provider, status)
    values (v_rest.id, 'lightspeed', 'disconnected')
    on conflict (restaurant_id, provider) do nothing;

    insert into public.restaurant_pos_connections (restaurant_id, provider, status)
    values (v_rest.id, 'toast', 'disconnected')
    on conflict (restaurant_id, provider) do nothing;
  end loop;
end $$;

commit;
