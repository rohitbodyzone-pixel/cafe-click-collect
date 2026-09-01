-- Safe to re-run. This migration never drops tables or deletes existing data.
create table if not exists public.customisation_groups (
  id text primary key,
  name text not null,
  kind text not null unique check (kind in ('size','milk','sugar_quantity','sugar_type','extras')),
  display_order integer not null default 100
);

create table if not exists public.customisation_options (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.customisation_groups(id) on delete cascade,
  name text not null,
  price_adjustment_cents integer not null default 0 check (price_adjustment_cents >= 0),
  available boolean not null default true,
  display_order integer not null default 100,
  unique (group_id, name)
);

create table if not exists public.product_customisation_groups (
  product_id text not null references public.products(id) on delete cascade,
  group_id text not null references public.customisation_groups(id) on delete cascade,
  primary key (product_id, group_id)
);

alter table public.order_items
  add column if not exists selected_customisations jsonb not null default '[]'::jsonb;

insert into public.customisation_groups (id,name,kind,display_order) values
  ('size','Cup size','size',10),
  ('milk','Milk type','milk',20),
  ('sugar-quantity','Sugar quantity','sugar_quantity',30),
  ('sugar-type','Sugar type','sugar_type',40),
  ('extras','Extras','extras',50)
on conflict do nothing;

insert into public.customisation_options (group_id,name,price_adjustment_cents,display_order) values
  ('size','Small',0,10),('size','Medium',50,20),('size','Large',100,30),
  ('milk','Full Cream',0,10),('milk','Trim/Skim',0,20),('milk','Oat',100,30),
  ('milk','Almond',100,40),('milk','Soy',80,50),('milk','Coconut',100,60),('milk','No milk',0,70),
  ('sugar-quantity','No sugar',0,10),('sugar-quantity','1 sugar',0,20),
  ('sugar-quantity','2 sugars',0,30),('sugar-quantity','3 sugars',0,40),('sugar-quantity','4 sugars',0,50),
  ('sugar-type','White',0,10),('sugar-type','Raw',0,20),
  ('sugar-type','Brown',0,30),('sugar-type','Sweetener',0,40),
  ('extras','Extra shot',100,10),('extras','Decaf',50,20),('extras','Syrup',80,30)
on conflict (group_id,name) do nothing;

insert into public.product_customisation_groups (product_id,group_id)
select p.id,g.id from public.products p cross join public.customisation_groups g
where p.category = 'Coffee'
on conflict do nothing;

insert into public.product_customisation_groups (product_id,group_id)
select p.id,g.id from public.products p join public.customisation_groups g
  on g.kind in ('size','milk','sugar_quantity','sugar_type')
where p.category = 'Drinks'
on conflict do nothing;

alter table public.customisation_groups enable row level security;
alter table public.customisation_options enable row level security;
alter table public.product_customisation_groups enable row level security;
grant select,insert,update,delete on public.customisation_groups,public.customisation_options,public.product_customisation_groups to anon,authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customisation_groups' and policyname='Public customisation groups') then
    create policy "Public customisation groups" on public.customisation_groups for all to anon,authenticated using(true) with check(true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customisation_options' and policyname='Public customisation options') then
    create policy "Public customisation options" on public.customisation_options for all to anon,authenticated using(true) with check(true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_customisation_groups' and policyname='Public product customisations') then
    create policy "Public product customisations" on public.product_customisation_groups for all to anon,authenticated using(true) with check(true);
  end if;
end $$;

create or replace function public.insert_cafe_order_items(p_order_id text,p_items jsonb)
returns void language sql security definer set search_path='' as $$
  insert into public.order_items(order_id,product_id,product_name,unit_price_cents,quantity,notes,selected_customisations)
  select p_order_id,item->>'product_id',item->>'product_name',(item->>'unit_price_cents')::integer,
    (item->>'quantity')::integer,nullif(item->>'notes',''),coalesce(item->'selected_customisations','[]'::jsonb)
  from jsonb_array_elements(p_items) item
$$;

create or replace function public.place_cafe_order(p_id text,p_customer_name text,p_phone text,p_pickup_time text,p_pickup_slot text,p_total_cents integer,p_items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare slot_limit integer; slot_count integer;
begin
  if p_pickup_slot is null or p_pickup_slot='' then raise exception 'Please select a pickup time'; end if;
  perform pg_advisory_xact_lock(hashtext(p_pickup_slot));
  select max_orders_per_slot into slot_limit from public.cafe_settings where id=1;
  select count(*) into slot_count from public.orders where pickup_slot=p_pickup_slot;
  if slot_count>=slot_limit then raise exception 'This pickup time has just filled up. Please choose another time.'; end if;
  insert into public.orders(id,customer_name,phone,pickup_time,pickup_slot,total_cents,status,order_type)
  values(p_id,p_customer_name,p_phone,p_pickup_time,p_pickup_slot,p_total_cents,'Incoming','pickup');
  perform public.insert_cafe_order_items(p_id,p_items);
end $$;

create or replace function public.place_table_order(p_id text,p_table_id uuid,p_total_cents integer,p_order_notes text,p_items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare selected_table public.cafe_tables%rowtype;
begin
  select * into selected_table from public.cafe_tables where id=p_table_id and active=true;
  if not found then raise exception 'This table is not available'; end if;
  insert into public.orders(id,customer_name,phone,pickup_time,pickup_slot,total_cents,status,order_type,table_id,table_code,table_name,order_notes)
  values(p_id,selected_table.display_name,'Table order','Table service',null,p_total_cents,'Incoming','table',selected_table.id,selected_table.code,selected_table.display_name,nullif(trim(p_order_notes),''));
  perform public.insert_cafe_order_items(p_id,p_items);
end $$;

revoke all on function public.insert_cafe_order_items(text,jsonb) from public;
revoke all on function public.place_cafe_order(text,text,text,text,text,integer,jsonb) from public;
revoke all on function public.place_table_order(text,uuid,integer,text,jsonb) from public;
grant execute on function public.place_cafe_order(text,text,text,text,text,integer,jsonb) to anon,authenticated;
grant execute on function public.place_table_order(text,uuid,integer,text,jsonb) to anon,authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='customisation_groups') then alter publication supabase_realtime add table public.customisation_groups; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='customisation_options') then alter publication supabase_realtime add table public.customisation_options; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='product_customisation_groups') then alter publication supabase_realtime add table public.product_customisation_groups; end if;
end $$;
