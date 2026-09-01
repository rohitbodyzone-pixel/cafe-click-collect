-- RPC to safely set manual surge minutes for wait time balancing

begin;

create or replace function public.set_manual_surge_minutes(
  p_restaurant_id uuid,
  p_surge integer
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.restaurants
  set manual_surge_minutes = greatest(0, p_surge),
      updated_at = now()
  where id = p_restaurant_id;
end;
$$;

grant execute on function public.set_manual_surge_minutes(uuid, integer) to anon, authenticated;

commit;
