-- Migration: Grant full read access for backup and audit exports
begin;

grant select on all tables in schema public to anon, authenticated;

-- Ensure select policy exists on restaurant_staff for admin exports
drop policy if exists "Allow reading restaurant staff for backup" on public.restaurant_staff;
create policy "Allow reading restaurant staff for backup" on public.restaurant_staff
  for select to anon, authenticated using (true);

commit;
