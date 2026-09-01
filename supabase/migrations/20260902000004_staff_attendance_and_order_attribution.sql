-- Migration: Staff Attendance (Clock In/Out) & Order Staff Attribution
begin;

-- 1. Create staff_attendance table
create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  staff_id uuid references public.restaurant_staff(id) on delete set null,
  staff_name text not null,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  duration_minutes integer,
  orders_taken_count integer default 0,
  device_info text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_attendance_restaurant_idx
  on public.staff_attendance (restaurant_id, clock_in_at desc);

create index if not exists staff_attendance_active_idx
  on public.staff_attendance (restaurant_id) where clock_out_at is null;

-- 2. Extend orders table with staff attribution
alter table public.orders
  add column if not exists created_by_staff_id uuid,
  add column if not exists created_by_staff_name text;

-- 3. RLS on staff_attendance
alter table public.staff_attendance enable row level security;
revoke all on public.staff_attendance from anon, authenticated;
grant select, insert, update on public.staff_attendance to anon, authenticated;

drop policy if exists "Staff read own restaurant attendance" on public.staff_attendance;
create policy "Staff read own restaurant attendance" on public.staff_attendance
  for select to anon, authenticated
  using (
    public.is_super_admin()
    or restaurant_id is not null
  );

drop policy if exists "Staff record attendance" on public.staff_attendance;
create policy "Staff record attendance" on public.staff_attendance
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Staff update attendance" on public.staff_attendance;
create policy "Staff update attendance" on public.staff_attendance
  for update to anon, authenticated
  using (true)
  with check (true);

-- 4. Clock-In RPC
create or replace function public.clock_in_staff(
  p_restaurant_id uuid,
  p_staff_id uuid,
  p_staff_name text,
  p_device_info text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rec record;
begin
  -- Check if already active shift exists for this staff member in this restaurant
  select * into v_rec
  from public.staff_attendance
  where restaurant_id = p_restaurant_id
    and (staff_id = p_staff_id or lower(staff_name) = lower(p_staff_name))
    and clock_out_at is null
  limit 1;

  if found then
    return jsonb_build_object(
      'status', 'already_clocked_in',
      'attendance_id', v_rec.id,
      'clock_in_at', v_rec.clock_in_at,
      'staff_name', v_rec.staff_name,
      'message', 'Already clocked in for this shift'
    );
  end if;

  insert into public.staff_attendance (
    restaurant_id, staff_id, staff_name, clock_in_at, device_info
  )
  values (
    p_restaurant_id, p_staff_id, p_staff_name, now(), p_device_info
  )
  returning * into v_rec;

  return jsonb_build_object(
    'status', 'success',
    'attendance_id', v_rec.id,
    'clock_in_at', v_rec.clock_in_at,
    'staff_name', v_rec.staff_name,
    'restaurant_id', v_rec.restaurant_id
  );
end;
$$;

-- 5. Clock-Out RPC
create or replace function public.clock_out_staff(
  p_attendance_id uuid,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rec record;
  v_duration int;
  v_orders_count int;
begin
  select * into v_rec
  from public.staff_attendance
  where id = p_attendance_id;

  if not found then
    raise exception 'Attendance session % not found', p_attendance_id;
  end if;

  if v_rec.clock_out_at is not null then
    return jsonb_build_object(
      'status', 'already_clocked_out',
      'attendance_id', v_rec.id,
      'clock_out_at', v_rec.clock_out_at,
      'duration_minutes', v_rec.duration_minutes
    );
  end if;

  v_duration := extract(epoch from (now() - v_rec.clock_in_at)) / 60;
  if v_duration < 1 then
    v_duration := 1;
  end if;

  -- Count orders taken during this session by this staff member
  select count(*) into v_orders_count
  from public.orders
  where restaurant_id = v_rec.restaurant_id
    and (created_by_staff_id = v_rec.staff_id or lower(created_by_staff_name) = lower(v_rec.staff_name))
    and created_at >= v_rec.clock_in_at;

  update public.staff_attendance
  set clock_out_at = now(),
      duration_minutes = v_duration,
      orders_taken_count = v_orders_count,
      notes = coalesce(p_notes, notes),
      updated_at = now()
  where id = p_attendance_id
  returning * into v_rec;

  return jsonb_build_object(
    'status', 'success',
    'attendance_id', v_rec.id,
    'clock_in_at', v_rec.clock_in_at,
    'clock_out_at', v_rec.clock_out_at,
    'duration_minutes', v_rec.duration_minutes,
    'orders_taken_count', v_rec.orders_taken_count,
    'staff_name', v_rec.staff_name
  );
end;
$$;

-- 6. Get Active Staff Attendance RPC
create or replace function public.get_active_staff_attendance(
  p_restaurant_id uuid
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb := '[]'::jsonb;
  r record;
begin
  for r in
    select id, staff_id, staff_name, clock_in_at, device_info,
           extract(epoch from (now() - clock_in_at)) / 60 as minutes_elapsed
    from public.staff_attendance
    where restaurant_id = p_restaurant_id
      and clock_out_at is null
    order by clock_in_at asc
  loop
    v_result := v_result || jsonb_build_object(
      'id', r.id,
      'staff_id', r.staff_id,
      'staff_name', r.staff_name,
      'clock_in_at', r.clock_in_at,
      'device_info', r.device_info,
      'minutes_elapsed', floor(r.minutes_elapsed)
    );
  end loop;

  return v_result;
end;
$$;

grant execute on function public.clock_in_staff(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.clock_out_staff(uuid, text) to anon, authenticated;
grant execute on function public.get_active_staff_attendance(uuid) to anon, authenticated;

commit;
