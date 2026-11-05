-- Dr Ria's Admin Helper & Storage Policy Hardening
-- Migration: 20261105010000_admin_security_function.sql
-- Description:
-- 1. Creates public.is_admin() SECURITY DEFINER function with SET search_path = ''
-- 2. Updates storage.objects policies to call public.is_admin(), preserving table privacy on admin_users

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = p_user_id
  );
$$;

revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- Update storage policies to use public.is_admin()
drop policy if exists "Admin Upload Access for Images" on storage.objects;
create policy "Admin Upload Access for Images"
  on storage.objects
  for insert
  with check (
    bucket_id in ('product-images', 'brand-assets')
    and public.is_admin((select auth.uid()))
  );

drop policy if exists "Admin Update Access for Images" on storage.objects;
create policy "Admin Update Access for Images"
  on storage.objects
  for update
  using (
    bucket_id in ('product-images', 'brand-assets')
    and public.is_admin((select auth.uid()))
  );

drop policy if exists "Admin Delete Access for Images" on storage.objects;
create policy "Admin Delete Access for Images"
  on storage.objects
  for delete
  using (
    bucket_id in ('product-images', 'brand-assets')
    and public.is_admin((select auth.uid()))
  );

