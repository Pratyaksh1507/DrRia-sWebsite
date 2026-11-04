-- Dr Ria's Security Fixes Migration
-- Migration: 20261104_webhook_events_and_orders_fk.sql
-- Description:
-- 1. Fix orders.user_id constraint contradiction by enforcing ON DELETE RESTRICT
-- 2. Add webhook_events table for idempotent gateway event deduplication with RLS

--------------------------------------------------------------------------------
-- 1. ORDERS TABLE FOREIGN KEY FIX (ON DELETE RESTRICT)
--------------------------------------------------------------------------------
-- Why ON DELETE RESTRICT:
-- Intended to preserve order records. Retention period to be confirmed by the business's accountant.
-- Resolves the initial schema contradiction (NOT NULL specified alongside ON DELETE SET NULL).

do $$
begin
  -- Drop existing foreign key constraint on orders.user_id if it exists
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'orders_user_id_fkey'
      and table_name = 'orders'
  ) then
    alter table public.orders drop constraint orders_user_id_fkey;
  end if;
end $$;

-- Re-apply foreign key with ON DELETE RESTRICT and NOT NULL
alter table public.orders
  alter column user_id set not null;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete restrict;

--------------------------------------------------------------------------------
-- 2. WEBHOOK EVENTS TABLE (Idempotency & Deduplication)
--------------------------------------------------------------------------------
-- Records all incoming payment gateway events to guarantee strictly once-only
-- processing. Prevents double-fulfillment, duplicate balance credit, or double-emails.
create table if not exists public.webhook_events (
  id uuid default gen_random_uuid() primary key,
  gateway text not null default 'razorpay',
  event_id text not null unique,
  event_type text not null,
  processing_status text not null check (
    processing_status in ('processing', 'processed', 'failed', 'skipped')
  ) default 'processing',
  processed_at timestamptz,
  payload_hash text not null,
  created_at timestamptz default now() not null
);

-- Indices for rapid event lookup
create index if not exists webhook_events_event_id_idx on public.webhook_events(event_id);
create index if not exists webhook_events_gateway_status_idx on public.webhook_events(gateway, processing_status);
create index if not exists webhook_events_created_at_idx on public.webhook_events(created_at desc);

-- Security: Enable Row Level Security (RLS)
alter table public.webhook_events enable row level security;

-- NOTE: No client policies are created. This table is strictly backend-only
-- and accessible solely via the Supabase Service Role key (admin client).
-- Direct client access through anon or authenticated roles is completely denied.

