-- Persist cafe staff authorization against the immutable Supabase Auth user ID.
-- Existing staff rows and Auth users are preserved and linked by normalized email.
alter table public.cafe_staff
  add column if not exists user_id uuid references auth.users(id) on delete restrict;

update public.cafe_staff staff
set user_id = users.id
from auth.users users
where staff.user_id is null
  and lower(users.email) = lower(staff.email);

create unique index if not exists cafe_staff_user_id_key
  on public.cafe_staff(user_id)
  where user_id is not null;

create or replace function public.is_cafe_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.cafe_staff
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_cafe_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.cafe_staff
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_cafe_staff() from public;
revoke all on function public.is_cafe_admin() from public;
grant execute on function public.is_cafe_staff() to authenticated;
grant execute on function public.is_cafe_admin() to authenticated;

create or replace function public.authorize_cafe_staff(
  staff_email text,
  staff_display_name text default '',
  staff_role text default 'staff'
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  normalized_email text := lower(trim(staff_email));
  target_user_id uuid;
begin
  if not public.is_cafe_admin() then
    raise exception 'Cafe administrator access required';
  end if;
  if staff_role not in ('admin', 'staff') then
    raise exception 'Invalid staff role';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if target_user_id is null then
    raise exception 'Create this email in Supabase Authentication before authorizing it';
  end if;

  insert into public.cafe_staff(email, user_id, display_name, role)
  values (normalized_email, target_user_id, trim(staff_display_name), staff_role)
  on conflict (email) do update set
    user_id = excluded.user_id,
    display_name = excluded.display_name,
    role = excluded.role;
end;
$$;

revoke all on function public.authorize_cafe_staff(text, text, text) from public;
grant execute on function public.authorize_cafe_staff(text, text, text) to authenticated;

