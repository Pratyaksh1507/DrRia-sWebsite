-- Dr Ria's Initial Supabase Schema & Security Policies
-- Migration: 20261102_initial_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. PROFILES TABLE
--------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

--------------------------------------------------------------------------------
-- 2. ADDRESSES TABLE
--------------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.addresses enable row level security;

-- Address Policies (users read and write only their own rows)
create policy "Users can read own addresses"
  on public.addresses
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own addresses"
  on public.addresses
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own addresses"
  on public.addresses
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own addresses"
  on public.addresses
  for delete
  using (auth.uid() = user_id);

create index if not exists addresses_user_id_idx on public.addresses(user_id);

--------------------------------------------------------------------------------
-- 3. ORDERS TABLE
--------------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key, -- e.g. 'DRRIA-XXXXXX'
  user_id uuid references auth.users on delete set null not null,
  status text not null check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')) default 'pending',
  subtotal integer not null,
  shipping integer not null default 0,
  total integer not null,
  address_snapshot jsonb not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  idempotency_key text unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.orders enable row level security;

-- Orders Policies
-- Users can view their own orders; inserts and updates happen via server (service role)
create policy "Users can view own orders"
  on public.orders
  for select
  using (auth.uid() = user_id);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

--------------------------------------------------------------------------------
-- 4. ORDER ITEMS TABLE
--------------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id text references public.orders(id) on delete cascade not null,
  product_slug text not null,
  product_name text not null,
  unit_price integer not null,
  quantity integer not null
);

alter table public.order_items enable row level security;

-- Order Items Policies
-- Users can read items for orders that belong to them
create policy "Users can view items in own orders"
  on public.order_items
  for select
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.order_items.order_id
        and public.orders.user_id = auth.uid()
    )
  );

create index if not exists order_items_order_id_idx on public.order_items(order_id);

--------------------------------------------------------------------------------
-- 5. TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
--------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if already exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--------------------------------------------------------------------------------
-- 5. CARTS TABLE (Server-side persisted carts for signed-in users)
--------------------------------------------------------------------------------
create table if not exists public.carts (
  user_id uuid references auth.users on delete cascade primary key,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now() not null
);

alter table public.carts enable row level security;

create policy "Users can read own cart"
  on public.carts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own cart"
  on public.carts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cart"
  on public.carts
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own cart"
  on public.carts
  for delete
  using (auth.uid() = user_id);

