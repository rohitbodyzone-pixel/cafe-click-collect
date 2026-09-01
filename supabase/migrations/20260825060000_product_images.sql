create table if not exists public.cafe_staff (
  email text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
  display_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.cafe_staff enable row level security;

create or replace function public.is_cafe_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.cafe_staff
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_cafe_staff() from public;
grant execute on function public.is_cafe_staff() to authenticated;

create or replace function public.is_cafe_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.cafe_staff
    where email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'admin'
  );
$$;

revoke all on function public.is_cafe_admin() from public;
grant execute on function public.is_cafe_admin() to authenticated;

create or replace function public.claim_first_cafe_admin()
returns void
language plpgsql security definer set search_path = ''
as $$
declare staff_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or staff_email = '' then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtext('claim_first_cafe_admin'));
  if exists (select 1 from public.cafe_staff) then raise exception 'The first admin has already been created'; end if;
  insert into public.cafe_staff(email, display_name, role) values (staff_email, split_part(staff_email, '@', 1), 'admin');
end;
$$;

revoke all on function public.claim_first_cafe_admin() from public;
grant execute on function public.claim_first_cafe_admin() to authenticated;

alter table public.products
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Cafe staff can upload product images" on storage.objects;
create policy "Cafe staff can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_cafe_staff());

drop policy if exists "Cafe staff can replace product images" on storage.objects;
create policy "Cafe staff can replace product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_cafe_staff())
with check (bucket_id = 'product-images' and public.is_cafe_staff());

drop policy if exists "Cafe staff can delete product images" on storage.objects;
create policy "Cafe staff can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_cafe_staff());
