-- Migration: Ensure order_items read access for staff and KDS
begin;

grant select, insert, update on public.order_items to anon, authenticated;

drop policy if exists "Authorized staff read order items" on public.order_items;
drop policy if exists "Public can read cafe order items" on public.order_items;
drop policy if exists "Allow reading order items" on public.order_items;

create policy "Allow reading order items" on public.order_items
  for select to anon, authenticated using (true);

commit;
