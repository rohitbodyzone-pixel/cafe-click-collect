-- Allow authenticated staff to read their own staff profile + Super Admins read all
begin;

grant select on public.restaurant_staff to authenticated;

drop policy if exists "Staff read own restaurant staff" on public.restaurant_staff;
create policy "Staff read own restaurant staff" on public.restaurant_staff
  for select to authenticated
  using (
    public.is_super_admin()
    or user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or (restaurant_id is not null and public.is_restaurant_staff(restaurant_id))
  );

-- RPC for securely fetching current user's staff profile
create or replace function public.get_my_staff_profile()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_staff record;
begin
  if v_uid is null and v_email = '' then
    return null;
  end if;

  select * into v_staff
  from public.restaurant_staff
  where (user_id is not null and user_id = v_uid)
     or (email is not null and lower(email) = v_email)
  order by (case when role = 'super_admin' then 1 when role = 'owner' then 2 else 3 end)
  limit 1;

  if found then
    return jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'email', v_staff.email,
      'display_name', v_staff.display_name,
      'role', v_staff.role,
      'restaurant_id', v_staff.restaurant_id
    );
  else
    return null;
  end if;
end;
$$;

grant execute on function public.get_my_staff_profile() to anon, authenticated;

commit;
