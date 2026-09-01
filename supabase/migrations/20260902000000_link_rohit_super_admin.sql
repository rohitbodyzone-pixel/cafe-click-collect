-- Migration: Register and Link rohitbodyzone@gmail.com as Global Super Admin
begin;

-- 1. Remove any legacy/duplicate rows for rohitbodyzone@gmail.com
delete from public.restaurant_staff
where lower(email) = 'rohitbodyzone@gmail.com'
   or user_id = (select id from auth.users where lower(email) = 'rohitbodyzone@gmail.com' limit 1);

-- 2. Insert single clean global super_admin record with restaurant_id = null
insert into public.restaurant_staff (restaurant_id, email, display_name, role, user_id)
values (
  null,
  'rohitbodyzone@gmail.com',
  'Rohit (Platform Super Admin)',
  'super_admin',
  (select id from auth.users where lower(email) = 'rohitbodyzone@gmail.com' limit 1)
);

-- 3. Enhance is_super_admin() function to match by either auth.uid() or verified auth JWT email
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff s
    where (
      s.user_id = auth.uid()
      or (
        auth.jwt() ->> 'email' is not null
        and lower(s.email) = lower(auth.jwt() ->> 'email')
      )
    )
    and s.role = 'super_admin'
  );
$$;

-- 4. Create sync function to link user_id automatically on session refresh
create or replace function public.sync_current_user_staff()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(auth.jwt() ->> 'email'));
  v_staff record;
begin
  if v_uid is null or v_email is null then
    return jsonb_build_object('status', 'anonymous');
  end if;

  update public.restaurant_staff
  set user_id = v_uid,
      updated_at = now()
  where lower(email) = v_email and (user_id is null or user_id != v_uid);

  select * into v_staff
  from public.restaurant_staff
  where user_id = v_uid or lower(email) = v_email
  limit 1;

  if found then
    return jsonb_build_object(
      'status', 'linked',
      'email', v_staff.email,
      'role', v_staff.role,
      'restaurant_id', v_staff.restaurant_id
    );
  else
    return jsonb_build_object('status', 'not_staff', 'email', v_email);
  end if;
end;
$$;

grant execute on function public.sync_current_user_staff() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;

commit;
