-- Dr Ria's Storage Buckets & Policies Migration
-- Migration: 20261104140000_storage_buckets.sql
-- Description:
-- 1. Creates storage buckets 'product-images' and 'brand-assets'
-- 2. Configures public read access for storefront display
-- 3. Restricts allowed MIME types to safe raster images (JPEG, PNG, WebP, AVIF) with 5MB limit
-- 4. Strictly omits active XML/SVG formats from upload policies to eliminate Stored XSS vectors
-- 5. Restricts write, update, and delete access strictly to authenticated admin users

--------------------------------------------------------------------------------
-- 1. CREATE STORAGE BUCKETS WITH STRICT MIME CONSTRAINTS
--------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB max per image
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif'] -- Raster formats only; SVGs disallowed
  ),
  (
    'brand-assets',
    'brand-assets',
    true,
    5242880, -- 5 MB max per asset
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif'] -- Raster formats only; SVGs disallowed
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

--------------------------------------------------------------------------------
-- 2. STORAGE OBJECT POLICIES (Row Level Security)
--------------------------------------------------------------------------------
-- Public can view images in product-images and brand-assets
drop policy if exists "Public Read Access for Brand and Products" on storage.objects;
create policy "Public Read Access for Brand and Products"
  on storage.objects
  for select
  using (bucket_id in ('product-images', 'brand-assets'));

-- Only verified administrators can upload images
drop policy if exists "Admin Upload Access for Images" on storage.objects;
create policy "Admin Upload Access for Images"
  on storage.objects
  for insert
  with check (
    bucket_id in ('product-images', 'brand-assets')
    and exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

-- Only verified administrators can update images
drop policy if exists "Admin Update Access for Images" on storage.objects;
create policy "Admin Update Access for Images"
  on storage.objects
  for update
  using (
    bucket_id in ('product-images', 'brand-assets')
    and exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

-- Only verified administrators can delete images
drop policy if exists "Admin Delete Access for Images" on storage.objects;
create policy "Admin Delete Access for Images"
  on storage.objects
  for delete
  using (
    bucket_id in ('product-images', 'brand-assets')
    and exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );
