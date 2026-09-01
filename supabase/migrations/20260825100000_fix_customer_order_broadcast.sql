begin;

create or replace function public.broadcast_customer_order_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  key text;
  changed_order_id text;
begin
  if tg_table_name = 'orders' then
    key := new.customer_key;
    changed_order_id := new.id;
  else
    changed_order_id := new.order_id;
    select customer_key into key from public.orders where id = changed_order_id;
  end if;

  if key is not null then
    perform realtime.send(
      jsonb_build_object('order_id', changed_order_id),
      'order-change',
      'customer-order:' || key,
      false
    );
  end if;
  return new;
end;
$$;

commit;
