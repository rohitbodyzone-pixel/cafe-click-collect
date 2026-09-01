-- Replace prototype-wide customer reads with high-entropy per-customer access.
-- Staff retain authenticated access to the complete order dashboard.

begin;

drop policy if exists "Public can read cafe orders" on public.orders;
drop policy if exists "Public can read cafe order items" on public.order_items;
drop policy if exists "Customers read loyalty balances" on public.customer_loyalty;

revoke select on public.orders, public.order_items, public.customer_loyalty from anon, authenticated;
grant select on public.orders, public.order_items, public.customer_loyalty to authenticated;

create policy "Authorized staff read orders" on public.orders
for select to authenticated using (public.is_cafe_staff());
create policy "Authorized staff read order items" on public.order_items
for select to authenticated using (public.is_cafe_staff());
create policy "Authorized staff read loyalty balances" on public.customer_loyalty
for select to authenticated using (public.is_cafe_staff());

create or replace function public.get_customer_orders(p_customer_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(
    to_jsonb(o) || jsonb_build_object(
      'order_items', coalesce((
        select jsonb_agg(to_jsonb(i) order by i.id)
        from public.order_items i where i.order_id = o.id
      ), '[]'::jsonb)
    ) order by o.created_at desc
  ), '[]'::jsonb)
  from public.orders o
  where o.customer_key = p_customer_key
    and p_customer_key ~* '^LOY-[0-9a-f-]{36}$';
$$;

create or replace function public.get_customer_loyalty(p_customer_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object(
      'points', points,
      'coffee_stamps', coffee_stamps,
      'free_coffees', free_coffees
    ) from public.customer_loyalty
    where customer_key = p_customer_key
      and p_customer_key ~* '^LOY-[0-9a-f-]{36}$'
  ), '{"points":0,"coffee_stamps":0,"free_coffees":0}'::jsonb);
$$;

revoke all on function public.get_customer_orders(text) from public;
revoke all on function public.get_customer_loyalty(text) from public;
grant execute on function public.get_customer_orders(text) to anon, authenticated;
grant execute on function public.get_customer_loyalty(text) to anon, authenticated;

create or replace function public.broadcast_customer_order_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare key text;
begin
  key := case when tg_table_name = 'orders' then new.customer_key else
    (select customer_key from public.orders where id = new.order_id) end;
  if key is not null then
    perform realtime.send(jsonb_build_object('order_id', case when tg_table_name = 'orders' then new.id else new.order_id end),
      'order-change', 'customer-order:' || key, false);
  end if;
  return new;
end;
$$;

drop trigger if exists customer_order_broadcast on public.orders;
create trigger customer_order_broadcast after insert or update on public.orders
for each row execute function public.broadcast_customer_order_change();
drop trigger if exists customer_order_item_broadcast on public.order_items;
create trigger customer_order_item_broadcast after insert or update on public.order_items
for each row execute function public.broadcast_customer_order_change();

create or replace function public.broadcast_customer_loyalty_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('customer_key', new.customer_key),
    'loyalty-change', 'loyalty-' || new.customer_key, false);
  return new;
end;
$$;
drop trigger if exists customer_loyalty_broadcast on public.customer_loyalty;
create trigger customer_loyalty_broadcast after insert or update on public.customer_loyalty
for each row execute function public.broadcast_customer_loyalty_change();

commit;
