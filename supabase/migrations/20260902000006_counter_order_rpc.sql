-- Migration: Counter Order RPC with Full Customisations & Staff Attribution
begin;

create or replace function public.place_counter_order(
  p_order_id text,
  p_restaurant_id uuid,
  p_customer_name text,
  p_payment_method text,
  p_total_cents integer,
  p_staff_id uuid,
  p_staff_name text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pickup_code text;
begin
  v_pickup_code := 'C' || floor(100 + random() * 900)::text;

  insert into public.orders (
    id,
    restaurant_id,
    customer_name,
    phone,
    pickup_time,
    pickup_code,
    status,
    payment_status,
    payment_method,
    subtotal_cents,
    discount_cents,
    total_cents,
    amount_paid_cents,
    created_by_staff_id,
    created_by_staff_name,
    order_type
  ) values (
    p_order_id,
    p_restaurant_id,
    coalesce(nullif(trim(p_customer_name), ''), 'Counter Customer'),
    'In-Store Counter',
    'Immediate',
    v_pickup_code,
    'Preparing',
    'paid',
    coalesce(p_payment_method, 'pay_at_counter'),
    p_total_cents,
    0,
    p_total_cents,
    p_total_cents,
    p_staff_id,
    p_staff_name,
    'pickup'
  );

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    unit_price_cents,
    quantity,
    notes,
    selected_customisations
  )
  select
    p_order_id,
    item->>'product_id',
    item->>'product_name',
    (item->>'unit_price_cents')::integer,
    (item->>'quantity')::integer,
    nullif(item->>'notes', ''),
    coalesce(item->'selected_customisations', '[]'::jsonb)
  from jsonb_array_elements(p_items) item;

  return jsonb_build_object(
    'status', 'success',
    'order_id', p_order_id,
    'pickup_code', v_pickup_code,
    'staff_name', p_staff_name
  );
end;
$$;

grant execute on function public.place_counter_order(text, uuid, text, text, integer, uuid, text, jsonb) to anon, authenticated;

-- Ensure insert policies on orders and order_items allow counter orders
drop policy if exists "Customers can place cafe orders" on public.orders;
create policy "Customers can place cafe orders" on public.orders for insert to anon, authenticated with check (true);

drop policy if exists "Customers can add cafe order items" on public.order_items;
create policy "Customers can add cafe order items" on public.order_items for insert to anon, authenticated with check (true);

commit;
