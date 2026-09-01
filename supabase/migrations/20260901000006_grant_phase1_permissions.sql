-- Ensure customer_loyalty and orders permissions and policies are fully granted to anon and authenticated

begin;

grant select, insert, update on public.customer_loyalty to anon, authenticated;
grant select, insert, update on public.orders to anon, authenticated;
grant select, insert, update on public.order_items to anon, authenticated;

-- Policy for customer_loyalty
drop policy if exists "Customer manage own loyalty" on public.customer_loyalty;
create policy "Customer manage own loyalty" on public.customer_loyalty
  for all to anon, authenticated
  using (true)
  with check (true);

-- Policy for orders
drop policy if exists "Customer insert orders" on public.orders;
create policy "Customer insert orders" on public.orders
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Public read orders" on public.orders;
create policy "Public read orders" on public.orders
  for select to anon, authenticated
  using (true);

drop policy if exists "Public update own order arrival" on public.orders;
create policy "Public update own order arrival" on public.orders
  for update to anon, authenticated
  using (true)
  with check (true);

commit;
