create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 100),
  category text not null check (category in ('Coffee', 'Drinks', 'Food')),
  price_cents integer not null check (price_cents >= 0),
  description text not null default '',
  emoji text not null default '☕',
  sold_out boolean not null default false,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.products (id, name, category, price_cents, description, emoji, display_order)
values
  ('flat-white', 'Flat White', 'Coffee', 550, 'Double espresso with silky steamed milk and a thin velvety finish.', '☕', 10),
  ('latte', 'Latte', 'Coffee', 600, 'Smooth espresso with generous steamed milk and a light layer of foam.', '🥛', 20),
  ('cappuccino', 'Cappuccino', 'Coffee', 600, 'A balanced espresso with steamed milk and a rich cap of foam.', '☕', 30),
  ('hot-chocolate', 'Hot Chocolate', 'Drinks', 650, 'Rich chocolate blended with steamed milk for a comforting classic.', '🍫', 40),
  ('blueberry-muffin', 'Blueberry Muffin', 'Food', 500, 'A soft, buttery muffin packed with juicy blueberries.', '🫐', 50)
on conflict (id) do nothing;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_orders_updated_at();

alter table public.products enable row level security;
revoke all on table public.products from anon, authenticated;
grant select, insert, update, delete on table public.products to anon, authenticated;

drop policy if exists "Public can read cafe menu" on public.products;
create policy "Public can read cafe menu" on public.products for select to anon, authenticated using (true);
drop policy if exists "Cafe staff can add menu items" on public.products;
create policy "Cafe staff can add menu items" on public.products for insert to anon, authenticated with check (true);
drop policy if exists "Cafe staff can edit menu items" on public.products;
create policy "Cafe staff can edit menu items" on public.products for update to anon, authenticated using (true) with check (true);
drop policy if exists "Cafe staff can delete menu items" on public.products;
create policy "Cafe staff can delete menu items" on public.products for delete to anon, authenticated using (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products') then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;
