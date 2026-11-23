-- Dr Ria's Table Privilege Hardening Migration
-- Migration: 20261105000000_table_privilege_hardening.sql
-- Description:
-- Defense-in-depth: Restricts PostgreSQL table-level grants so that:
-- 1. Backend-only tables (admin_users, audit_logs, webhook_events, inventory_reservations, coupons)
--    grant ZERO access to anon and authenticated roles.
-- 2. Immutable/server-controlled tables (products, orders, order_items, payments, refunds, coupon_redemptions)
--    revoke INSERT, UPDATE, DELETE, TRUNCATE from client roles (anon and authenticated).
-- 3. Customer-owned tables (profiles, addresses, carts, cart_items)
--    grant appropriate CRUD permissions to authenticated users (governed by RLS).
-- 4. service_role and postgres retain full ALL access for administrative server code.

--------------------------------------------------------------------------------
-- 1. BACKEND-ONLY TABLES (Zero client table grants)
--------------------------------------------------------------------------------
revoke all on table public.admin_users from anon, authenticated, public;
revoke all on table public.audit_logs from anon, authenticated, public;
revoke all on table public.webhook_events from anon, authenticated, public;
revoke all on table public.inventory_reservations from anon, authenticated, public;
revoke all on table public.coupons from anon, authenticated, public;

grant all on table public.admin_users to service_role, postgres;
grant all on table public.audit_logs to service_role, postgres;
grant all on table public.webhook_events to service_role, postgres;
grant all on table public.inventory_reservations to service_role, postgres;
grant all on table public.coupons to service_role, postgres;

--------------------------------------------------------------------------------
-- 2. PUBLIC & CUSTOMER READ-ONLY TABLES (No client mutations)
--------------------------------------------------------------------------------
-- Products catalogue: anyone can read active products (governed by RLS), zero client mutations
revoke all on table public.products from anon, authenticated, public;
grant select on table public.products to anon, authenticated;
grant all on table public.products to service_role, postgres;

-- Orders & Order Items: authenticated customers can read their own orders (governed by RLS)
-- Order creation & mutation is executed strictly server-side via service role
revoke all on table public.orders from anon, authenticated, public;
grant select on table public.orders to authenticated;
grant all on table public.orders to service_role, postgres;

revoke all on table public.order_items from anon, authenticated, public;
grant select on table public.order_items to authenticated;
grant all on table public.order_items to service_role, postgres;

-- Payments & Refunds: authenticated customers can view their payment/refund status (governed by RLS)
revoke all on table public.payments from anon, authenticated, public;
grant select on table public.payments to authenticated;
grant all on table public.payments to service_role, postgres;

revoke all on table public.refunds from anon, authenticated, public;
grant select on table public.refunds to authenticated;
grant all on table public.refunds to service_role, postgres;

-- Coupon Redemptions: authenticated customers can read their own redemptions (governed by RLS)
revoke all on table public.coupon_redemptions from anon, authenticated, public;
grant select on table public.coupon_redemptions to authenticated;
grant all on table public.coupon_redemptions to service_role, postgres;

--------------------------------------------------------------------------------
-- 3. CUSTOMER-OWNED TABLES (Client CRUD governed by RLS)
--------------------------------------------------------------------------------
-- Profiles: authenticated users manage their own profile
revoke all on table public.profiles from anon, authenticated, public;
grant select, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role, postgres;

-- Addresses: authenticated users manage their own shipping addresses
revoke all on table public.addresses from anon, authenticated, public;
grant select, insert, update, delete on table public.addresses to authenticated;
grant all on table public.addresses to service_role, postgres;

-- Carts: authenticated users manage their own cart container
revoke all on table public.carts from anon, authenticated, public;
grant select, insert, update, delete on table public.carts to authenticated;
grant all on table public.carts to service_role, postgres;

-- Cart Items: authenticated users manage their own line items
revoke all on table public.cart_items from anon, authenticated, public;
grant select, insert, update, delete on table public.cart_items to authenticated;
grant all on table public.cart_items to service_role, postgres;

