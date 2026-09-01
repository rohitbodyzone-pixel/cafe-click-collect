create table if not exists public.cafe_settings (
  id integer primary key default 1 check (id = 1),
  opening_time time not null default '07:00',
  closing_time time not null default '16:00',
  average_prep_minutes integer not null default 15 check (average_prep_minutes between 1 and 180),
  slot_interval_minutes integer not null default 5 check (slot_interval_minutes between 1 and 60),
  max_orders_per_slot integer not null default 5 check (max_orders_per_slot between 1 and 100),
  timezone text not null default 'Pacific/Auckland',
  updated_at timestamptz not null default now(),
  check (closing_time > opening_time)
);

insert into public.cafe_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists cafe_settings_set_updated_at on public.cafe_settings;
create trigger cafe_settings_set_updated_at before update on public.cafe_settings
for each row execute function public.set_orders_updated_at();

alter table public.orders add column if not exists pickup_slot text;
create index if not exists orders_pickup_slot_idx on public.orders (pickup_slot);

alter table public.cafe_settings enable row level security;
revoke all on table public.cafe_settings from anon, authenticated;
grant select, update on table public.cafe_settings to anon, authenticated;
drop policy if exists "Public can read pickup settings" on public.cafe_settings;
create policy "Public can read pickup settings" on public.cafe_settings for select to anon, authenticated using (true);
drop policy if exists "Cafe staff can update pickup settings" on public.cafe_settings;
create policy "Cafe staff can update pickup settings" on public.cafe_settings for update to anon, authenticated using (id = 1) with check (id = 1);

create or replace function public.place_cafe_order(
  p_id text, p_customer_name text, p_phone text, p_pickup_time text,
  p_pickup_slot text, p_total_cents integer, p_items jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  slot_limit integer;
  slot_count integer;
begin
  if p_pickup_slot is null or p_pickup_slot = '' then raise exception 'Please select a pickup time'; end if;
  perform pg_advisory_xact_lock(hashtext(p_pickup_slot));
  select max_orders_per_slot into slot_limit from public.cafe_settings where id = 1;
  select count(*) into slot_count from public.orders where pickup_slot = p_pickup_slot;
  if slot_count >= slot_limit then raise exception 'This pickup time has just filled up. Please choose another time.'; end if;

  insert into public.orders (id, customer_name, phone, pickup_time, pickup_slot, total_cents, status)
  values (p_id, p_customer_name, p_phone, p_pickup_time, p_pickup_slot, p_total_cents, 'Incoming');
  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity, notes)
  select p_id, item->>'product_id', item->>'product_name', (item->>'unit_price_cents')::integer,
    (item->>'quantity')::integer, nullif(item->>'notes', '')
  from jsonb_array_elements(p_items) item;
end;
$$;

revoke all on function public.place_cafe_order(text,text,text,text,text,integer,jsonb) from public;
grant execute on function public.place_cafe_order(text,text,text,text,text,integer,jsonb) to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cafe_settings') then
    alter publication supabase_realtime add table public.cafe_settings;
  end if;
end $$;
