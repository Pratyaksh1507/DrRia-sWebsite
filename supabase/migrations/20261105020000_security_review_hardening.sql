-- Dr Ria's Security Review Hardening Migration
-- Migration: 20261105020000_security_review_hardening.sql
-- Description:
-- 1. Eliminates admin UUID enumeration side-channel by replacing public.is_admin(uuid) with zero-arg public.is_admin().
-- 2. Hardens cart_items UPDATE RLS policy with explicit WITH CHECK clause preventing replacement with inactive/deleted products.
-- 3. Hardens redeem_coupon() to require that the order belongs to the customer and is in 'paid' status before finalizing redemption.

--------------------------------------------------------------------------------
-- 1. ZERO-ARGUMENT is_admin() (Prevents UUID enumeration side-channels)
--------------------------------------------------------------------------------
-- Drop existing storage policies before dropping the 1-argument function
drop policy if exists "Admin Upload Access for Images" on storage.objects;
drop policy if exists "Admin Update Access for Images" on storage.objects;
drop policy if exists "Admin Delete Access for Images" on storage.objects;

-- Drop old 1-argument version that allowed probing arbitrary UUIDs
drop function if exists public.is_admin(uuid);

-- Zero-argument version authoritatively evaluates only the caller's own auth.uid()
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Re-apply storage policies to call zero-arg is_admin()
create policy "Admin Upload Access for Images"
  on storage.objects
  for insert
  with check (
    bucket_id in ('product-images', 'brand-assets')
    and public.is_admin()
  );

create policy "Admin Update Access for Images"
  on storage.objects
  for update
  using (
    bucket_id in ('product-images', 'brand-assets')
    and public.is_admin()
  );

create policy "Admin Delete Access for Images"
  on storage.objects
  for delete
  using (
    bucket_id in ('product-images', 'brand-assets')
    and public.is_admin()
  );

--------------------------------------------------------------------------------
-- 2. CART_ITEMS UPDATE POLICY WITH STRICT WITH CHECK CLAUSE
--------------------------------------------------------------------------------
-- Ensures customers cannot replace product_id with an inactive or deleted product
drop policy if exists "Users can update own cart items" on public.cart_items;
create policy "Users can update own cart items"
  on public.cart_items
  for update
  using (cart_id = (select auth.uid()))
  with check (
    cart_id = (select auth.uid())
    and exists (
      select 1 from public.products p
      where p.id = cart_items.product_id
        and p.is_active = true
        and p.deleted_at is null
    )
  );

--------------------------------------------------------------------------------
-- 3. REDEEM_COUPON FINALIZATION (Requires Paid Order Status)
--------------------------------------------------------------------------------
-- Guarantees coupon usage is finalized only on verified paid orders,
-- preventing permanent coupon exhaustion on abandoned/unpaid checkouts.
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
  v_order record;
  v_coupon record;
  v_calculated_subtotal integer := 0;
  v_discount integer := 0;
begin
  v_user_id := auth.uid();

  -- 1. Verify target order belongs to customer and is in 'paid' state
  select * into v_order
  from public.orders
  where id = p_order_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Order not found');
  end if;

  -- If called by authenticated user, verify ownership
  if v_user_id is not null and v_order.user_id <> v_user_id then
    return jsonb_build_object('success', false, 'error', 'Unauthorized access to order');
  end if;

  -- Require paid status so coupon usage is never permanently consumed on unpaid or abandoned checkouts
  if v_order.status <> 'paid' then
    return jsonb_build_object('success', false, 'error', 'Coupon redemption requires verified paid order');
  end if;

  -- 2. Atomic row lock on coupon to prevent concurrent usage limit race conditions
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
    where coupon_id = v_coupon.id and user_id = v_order.user_id
  ) then
    return jsonb_build_object('success', false, 'error', 'Coupon already redeemed by this account');
  end if;

  -- 3. Calculate authoritative subtotal from order_items
  select coalesce(sum(oi.quantity * oi.unit_price), 0)
  into v_calculated_subtotal
  from public.order_items oi
  where oi.order_id = p_order_id;

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

  -- 4. Atomically increment usage count
  update public.coupons
  set times_used = times_used + 1
  where id = v_coupon.id;

  -- 5. Record durable redemption linked to finalized order
  insert into public.coupon_redemptions (
    coupon_id,
    order_id,
    user_id,
    discount_amount
  ) values (
    v_coupon.id,
    p_order_id,
    v_order.user_id,
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

revoke execute on function public.redeem_coupon(text, text) from public, anon;
grant execute on function public.redeem_coupon(text, text) to authenticated, service_role;
