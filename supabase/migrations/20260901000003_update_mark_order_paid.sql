-- Update mark_order_paid RPC function definition
create or replace function public.mark_order_paid(
  p_order_id text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;

  if not (public.is_restaurant_staff(v_order.restaurant_id) or auth.role() = 'service_role') then
    raise exception 'Unauthorized to manage orders for this restaurant';
  end if;

  update public.orders
  set payment_status = 'paid',
      amount_paid_cents = total_cents,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = p_order_id;
end;
$$;

grant execute on function public.mark_order_paid(text) to authenticated, anon;
