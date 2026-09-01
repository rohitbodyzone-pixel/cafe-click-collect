-- Update update_table_service_status RPC to support service_role and restaurant staff
create or replace function public.update_table_service_status(
  p_request_id uuid,
  p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_req public.table_service_requests%rowtype;
begin
  select * into v_req from public.table_service_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;

  if not (public.is_restaurant_staff(v_req.restaurant_id) or auth.role() = 'service_role') then
    raise exception 'Unauthorized to update service requests for this restaurant';
  end if;

  if p_status not in ('acknowledged', 'completed', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  update public.table_service_requests
  set status = p_status, updated_at = now()
  where id = p_request_id;
end;
$$;

grant execute on function public.update_table_service_status(uuid, text) to authenticated, anon;
