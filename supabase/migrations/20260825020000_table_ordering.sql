create table if not exists public.cafe_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) between 1 and 40),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
drop trigger if exists cafe_tables_set_updated_at on public.cafe_tables;
create trigger cafe_tables_set_updated_at before update on public.cafe_tables for each row execute function public.set_orders_updated_at();
alter table public.cafe_tables enable row level security;
grant select, insert, update, delete on public.cafe_tables to anon, authenticated;
create policy "Public can read tables" on public.cafe_tables for select to anon, authenticated using (true);
create policy "Cafe staff can add tables" on public.cafe_tables for insert to anon, authenticated with check (true);
create policy "Cafe staff can update tables" on public.cafe_tables for update to anon, authenticated using (true) with check (true);
create policy "Cafe staff can delete tables" on public.cafe_tables for delete to anon, authenticated using (true);

alter table public.orders add column if not exists order_type text not null default 'pickup' check (order_type in ('pickup','table'));
alter table public.orders add column if not exists table_id uuid references public.cafe_tables(id) on delete set null;
alter table public.orders add column if not exists table_code text;
alter table public.orders add column if not exists table_name text;
alter table public.orders add column if not exists order_notes text;
create index if not exists orders_order_type_idx on public.orders(order_type);

create or replace function public.place_table_order(p_id text, p_table_id uuid, p_total_cents integer, p_order_notes text, p_items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare selected_table public.cafe_tables%rowtype;
begin
  select * into selected_table from public.cafe_tables where id = p_table_id and active = true;
  if not found then raise exception 'This table is not available'; end if;
  insert into public.orders (id, customer_name, phone, pickup_time, pickup_slot, total_cents, status, order_type, table_id, table_code, table_name, order_notes)
  values (p_id, selected_table.display_name, 'Table order', 'Table service', null, p_total_cents, 'Incoming', 'table', selected_table.id, selected_table.code, selected_table.display_name, nullif(trim(p_order_notes), ''));
  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity, notes)
  select p_id, item->>'product_id', item->>'product_name', (item->>'unit_price_cents')::integer, (item->>'quantity')::integer, nullif(item->>'notes', '') from jsonb_array_elements(p_items) item;
end; $$;
revoke all on function public.place_table_order(text,uuid,integer,text,jsonb) from public;
grant execute on function public.place_table_order(text,uuid,integer,text,jsonb) to anon, authenticated;
do $$ begin if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cafe_tables') then alter publication supabase_realtime add table public.cafe_tables; end if; end $$;
