-- Dr Ria's E-Commerce Platform Core Schema Migration
-- Migration: 20261104130000_ecommerce_core_schema.sql
-- Description:
-- Adds production tables, strict constraints, and optimized RLS policies for:
-- 1. products (catalogue items, prices in integer, stock, verified HSN, tax rate, soft deletion)
-- 2. cart_items (normalized cart items referencing carts container with UNIQUE(cart_id, product_id))
-- 3. coupons & coupon_redemptions (authoritative database subtotal validation, atomic checkout redemption)
-- 4. payments & refunds (audited payment transactions and gateway refund tracking with unique constraints)
-- 5. inventory_reservations (short-lived checkout locks to prevent overselling)
-- 6. order_items enhancement (immutable GST tax rate, tax amount, discount, and HSN snapshots without universal defaults)
-- 7. orders enhancement (unique constraints on gateway payment and order identifiers)
--
-- Security:
-- - RLS enabled on all tables
-- - Read access strictly scoped to authenticated user or public catalogue where intended
-- - Write access strictly restricted via RLS or server-only service role

--------------------------------------------------------------------------------
-- 1. PRODUCTS TABLE
--------------------------------------------------------------------------------
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  category text not null,
  tagline text,
  description text,
  price integer not null check (price >= 0),
  mrp integer not null check (mrp >= price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  hsn_code text not null, -- Specific HSN classification (subject to accountant confirmation)
  tax_rate numeric(4, 2) not null check (tax_rate in (0.00, 5.00, 12.00, 18.00, 28.00)), -- Verified GST rate
  is_active boolean not null default true,
  deleted_at timestamptz, -- Soft deletion timestamp to preserve foreign-key integrity in orders
  badge text,
  image_url text,
  rating numeric(3, 2) default 4.80 check (rating >= 1.00 and rating <= 5.00),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_active_idx on public.products(is_active) where deleted_at is null;
create index if not exists products_category_idx on public.products(category);

alter table public.products enable row level security;

-- Anyone (guest or authenticated) can view active, non-deleted products
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
  on public.products
  for select
  using (is_active = true and deleted_at is null);

--------------------------------------------------------------------------------
-- 2. CART ITEMS TABLE (Normalized Line Items referencing public.carts)
--------------------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid default gen_random_uuid() primary key,
  cart_id uuid references public.carts(user_id) on delete cascade not null,
  product_id uuid references public.products(id) on delete restrict not null,
  quantity integer not null check (quantity > 0 and quantity <= 10),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint unique_cart_product unique (cart_id, product_id)
);

create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items(product_id);

alter table public.cart_items enable row level security;

-- Customers can view only items belonging to their own cart
drop policy if exists "Users can view own cart items" on public.cart_items;
create policy "Users can view own cart items"
  on public.cart_items
  for select
  using (cart_id = (select auth.uid()));

-- Customers can add only active, non-deleted products to their own cart
drop policy if exists "Users can insert own cart items" on public.cart_items;
create policy "Users can insert own cart items"
  on public.cart_items
  for insert
  with check (
    cart_id = (select auth.uid())
    and exists (
      select 1 from public.products p
      where p.id = cart_items.product_id
        and p.is_active = true
        and p.deleted_at is null
    )
  );

-- Customers can update quantities only for their own cart items
drop policy if exists "Users can update own cart items" on public.cart_items;
create policy "Users can update own cart items"
  on public.cart_items
  for update
  using (cart_id = (select auth.uid()));

-- Customers can delete only their own cart items
drop policy if exists "Users can delete own cart items" on public.cart_items;
create policy "Users can delete own cart items"
  on public.cart_items
  for delete
  using (cart_id = (select auth.uid()));

--------------------------------------------------------------------------------
-- 3. COUPONS & COUPON REDEMPTIONS
--------------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'flat')),
  discount_value integer not null check (discount_value > 0),
  min_order_value integer not null default 0 check (min_order_value >= 0),
  max_discount integer check (max_discount is null or max_discount > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists coupons_code_idx on public.coupons(code);
create index if not exists coupons_active_dates_idx on public.coupons(is_active, starts_at, expires_at);

alter table public.coupons enable row level security;

-- SECURITY NOTICE: ZERO client SELECT policies are created on public.coupons.
-- Direct table scraping or promo code enumeration is completely denied.
-- Coupon validation is performed strictly through the server-side RPC below.

create or replace function public.validate_coupon(
  lookup_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_coupon record;
  v_calculated_subtotal integer := 0;
  v_discount integer := 0;
  v_item_count integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'error', 'Authentication required to apply coupon');
  end if;

  if lookup_code is null or trim(lookup_code) = '' then
    return jsonb_build_object('valid', false, 'error', 'Coupon code is required');
  end if;

  -- 1. Authoritative cart subtotal calculation:
  -- Sum active, non-deleted product prices and quantities belonging to the customer's cart
  select
    coalesce(sum(ci.quantity * p.price), 0),
    count(ci.id)
  into v_calculated_subtotal, v_item_count
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_user_id
    and p.is_active = true
    and p.deleted_at is null;

  -- Fallback check for session cart stored in public.carts (jsonb)
  if v_item_count = 0 then
    select coalesce(sum((item->>'quantity')::integer * p.price), 0)
    into v_calculated_subtotal
    from public.carts c,
         jsonb_array_elements(c.items) as item
    join public.products p on p.slug = item->>'slug'
    where c.user_id = v_user_id
      and p.is_active = true
      and p.deleted_at is null;
  end if;

  if v_calculated_subtotal <= 0 then
    return jsonb_build_object('valid', false, 'error', 'Your cart is empty');
  end if;

  -- 2. Validate coupon existence and active status
  select * into v_coupon
  from public.coupons
  where lower(trim(code)) = lower(trim(lookup_code))
    and is_active = true
    and starts_at <= now()
    and (expires_at is null or expires_at > now());

  if not found then
    return jsonb_build_object('valid', false, 'error', 'Invalid or expired coupon code');
  end if;

  -- 3. Validate global usage limit
  if v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
    return jsonb_build_object('valid', false, 'error', 'Coupon redemption limit has been reached');
  end if;

  -- 4. Validate customer single-use limit (per user account)
  if exists (
    select 1 from public.coupon_redemptions
    where coupon_id = v_coupon.id
      and user_id = v_user_id
  ) then
    return jsonb_build_object('valid', false, 'error', 'You have already redeemed this coupon');
  end if;

  -- 5. Validate minimum order value against authoritative subtotal
  if v_calculated_subtotal < v_coupon.min_order_value then
    return jsonb_build_object(
      'valid', false,
      'error', 'Minimum order subtotal of ₹' || (v_coupon.min_order_value) || ' required'
    );
  end if;

  -- 6. Calculate discount
  if v_coupon.discount_type = 'percentage' then
    v_discount := (v_calculated_subtotal * v_coupon.discount_value) / 100;
    if v_coupon.max_discount is not null and v_discount > v_coupon.max_discount then
      v_discount := v_coupon.max_discount;
    end if;
  else
    v_discount := least(v_coupon.discount_value, v_calculated_subtotal);
  end if;

  return jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'subtotal', v_calculated_subtotal
  );
end;
$$;

revoke execute on function public.validate_coupon(text) from public;
revoke execute on function public.validate_coupon(text) from anon;
grant execute on function public.validate_coupon(text) to authenticated;
grant execute on function public.validate_coupon(text) to service_role;

-- Table to store redeemed coupons linked to finalized orders
create table if not exists public.coupon_redemptions (
  id uuid default gen_random_uuid() primary key,
  coupon_id uuid references public.coupons(id) on delete restrict not null,
  order_id text references public.orders(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  discount_amount integer not null check (discount_amount >= 0),
  redeemed_at timestamptz default now() not null,
  constraint unique_coupon_order unique (coupon_id, order_id)
);

create index if not exists coupon_redemptions_user_id_idx on public.coupon_redemptions(user_id);
create index if not exists coupon_redemptions_coupon_id_idx on public.coupon_redemptions(coupon_id);
create index if not exists coupon_redemptions_order_id_idx on public.coupon_redemptions(order_id);

alter table public.coupon_redemptions enable row level security;

-- Customers can view only their own redemptions
drop policy if exists "Users can view own coupon redemptions" on public.coupon_redemptions;
create policy "Users can view own coupon redemptions"
  on public.coupon_redemptions
  for select
  using (user_id = (select auth.uid()));

-- Atomic Coupon Redemption RPC for Checkout (prevents concurrent race conditions on usage_limit)
create or replace function public.redeem_coupon(
  lookup_code text,
  p_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_coupon record;
  v_calculated_subtotal integer := 0;
  v_discount integer := 0;
  v_item_count integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  -- Confirm the target order exists and belongs to the authenticated user
  if not exists (
    select 1 from public.orders
    where id = p_order_id and user_id = v_user_id
  ) then
    return jsonb_build_object('success', false, 'error', 'Order not found');
  end if;

  -- Atomic row lock on coupon to prevent concurrent usage limit race conditions
  select * into v_coupon
  from public.coupons
  where lower(trim(code)) = lower(trim(lookup_code))
    and is_active = true
    and starts_at <= now()
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired coupon');
  end if;

  if v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
    return jsonb_build_object('success', false, 'error', 'Coupon redemption limit has been reached');
  end if;

  if exists (
    select 1 from public.coupon_redemptions
    where coupon_id = v_coupon.id and user_id = v_user_id
  ) then
    return jsonb_build_object('success', false, 'error', 'Coupon already redeemed by this account');
  end if;

  -- Compute authoritative subtotal
  select
    coalesce(sum(ci.quantity * p.price), 0),
    count(ci.id)
  into v_calculated_subtotal, v_item_count
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_user_id
    and p.is_active = true
    and p.deleted_at is null;

  if v_item_count = 0 then
    select coalesce(sum((item->>'quantity')::integer * p.price), 0)
    into v_calculated_subtotal
    from public.carts c,
         jsonb_array_elements(c.items) as item
    join public.products p on p.slug = item->>'slug'
    where c.user_id = v_user_id
      and p.is_active = true
      and p.deleted_at is null;
  end if;

  if v_calculated_subtotal < v_coupon.min_order_value then
    return jsonb_build_object('success', false, 'error', 'Minimum order value requirement not met');
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount := (v_calculated_subtotal * v_coupon.discount_value) / 100;
    if v_coupon.max_discount is not null and v_discount > v_coupon.max_discount then
      v_discount := v_coupon.max_discount;
    end if;
  else
    v_discount := least(v_coupon.discount_value, v_calculated_subtotal);
  end if;

  -- Increment usage count atomically
  update public.coupons
  set times_used = times_used + 1
  where id = v_coupon.id;

  -- Record durable redemption linked to order
  insert into public.coupon_redemptions (
    coupon_id,
    order_id,
    user_id,
    discount_amount
  ) values (
    v_coupon.id,
    p_order_id,
    v_user_id,
    v_discount
  );

  return jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_discount
  );
end;
$$;

revoke execute on function public.redeem_coupon(text, text) from public;
revoke execute on function public.redeem_coupon(text, text) from anon;
grant execute on function public.redeem_coupon(text, text) to authenticated;
grant execute on function public.redeem_coupon(text, text) to service_role;

--------------------------------------------------------------------------------
-- 4. PAYMENTS & REFUNDS (Authoritative Transaction Ledger)
--------------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  order_id text references public.orders(id) on delete restrict not null,
  gateway text not null default 'razorpay',
  gateway_payment_id text unique not null,
  gateway_order_id text not null,
  amount integer not null check (amount > 0),
  currency text not null default 'INR',
  status text not null check (status in ('authorized', 'captured', 'failed', 'refunded')),
  method text,
  error_code text,
  error_description text,
  raw_response jsonb,
  created_at timestamptz default now() not null
);

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_gateway_payment_id_idx on public.payments(gateway_payment_id);
create index if not exists payments_gateway_order_id_idx on public.payments(gateway_order_id);
create index if not exists payments_status_idx on public.payments(status);

alter table public.payments enable row level security;

-- Customers can view payment records for their own orders
drop policy if exists "Users can view payments for own orders" on public.payments;
create policy "Users can view payments for own orders"
  on public.payments
  for select
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.payments.order_id
        and public.orders.user_id = (select auth.uid())
    )
  );

create table if not exists public.refunds (
  id uuid default gen_random_uuid() primary key,
  order_id text references public.orders(id) on delete restrict not null,
  payment_id uuid references public.payments(id) on delete restrict not null,
  gateway_refund_id text unique not null,
  amount integer not null check (amount > 0),
  reason text not null,
  status text not null check (status in ('pending', 'processed', 'failed')) default 'pending',
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  processed_at timestamptz
);

create index if not exists refunds_order_id_idx on public.refunds(order_id);
create index if not exists refunds_payment_id_idx on public.refunds(payment_id);
create index if not exists refunds_gateway_refund_id_idx on public.refunds(gateway_refund_id);
create index if not exists refunds_status_idx on public.refunds(status);
create index if not exists refunds_initiated_by_idx on public.refunds(initiated_by);

alter table public.refunds enable row level security;

-- Customers can view refund status for their own orders
drop policy if exists "Users can view refunds for own orders" on public.refunds;
create policy "Users can view refunds for own orders"
  on public.refunds
  for select
  using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.refunds.order_id
        and public.orders.user_id = (select auth.uid())
    )
  );

--------------------------------------------------------------------------------
-- 5. INVENTORY RESERVATIONS (Checkout Hold to Prevent Overselling)
--------------------------------------------------------------------------------
create table if not exists public.inventory_reservations (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  order_id text references public.orders(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null,
  status text not null check (status in ('reserved', 'fulfilled', 'released')) default 'reserved',
  created_at timestamptz default now() not null
);

create index if not exists inv_res_product_status_idx on public.inventory_reservations(product_id, status);
create index if not exists inv_res_expires_at_idx on public.inventory_reservations(expires_at);
create index if not exists inv_res_order_id_idx on public.inventory_reservations(order_id);

alter table public.inventory_reservations enable row level security;
-- NOTE: Strictly server-only. Zero client policies. Accessible solely via service role.

--------------------------------------------------------------------------------
-- 6. IMMUTABLE HISTORICAL SNAPSHOT ENHANCEMENTS ON ORDER_ITEMS & ORDERS
--------------------------------------------------------------------------------
-- Preserves complete immutable accounting snapshots per order line item.
-- NOTICE: Universal defaults (18.00 tax rate and 3304 HSN) are deliberately omitted.
-- Product tax configuration must be populated explicitly at checkout from public.products.
alter table public.order_items
  add column if not exists product_id uuid references public.products(id) on delete restrict,
  add column if not exists tax_rate numeric(4, 2),
  add column if not exists hsn_code text,
  add column if not exists taxable_amount integer default 0 not null,
  add column if not exists tax_amount integer default 0 not null,
  add column if not exists discount_amount integer default 0 not null,
  add column if not exists total_amount integer default 0 not null;

create index if not exists order_items_product_id_idx on public.order_items(product_id);

-- Ensure orders payment identifiers have unique constraints to prevent replay attacks
create unique index if not exists orders_razorpay_payment_id_unique
  on public.orders (razorpay_payment_id)
  where razorpay_payment_id is not null;

create unique index if not exists orders_razorpay_order_id_unique
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;
