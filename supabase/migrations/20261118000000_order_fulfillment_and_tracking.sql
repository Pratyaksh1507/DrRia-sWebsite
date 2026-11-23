-- Migration: 20261118000000_order_fulfillment_and_tracking.sql
-- Description:
-- 1. Adds courier tracking fields to public.orders (courier_name, awb_number, tracking_url, shipped_at, delivered_at, cancellation_reason).
-- 2. Expands order status check constraint to include 'processing' for fulfillment staging.
-- 3. Adds index on awb_number for fast lookups.

-- 1. ADD FULFILLMENT & TRACKING COLUMNS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS awb_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 2. CREATE AWB INDEX
CREATE INDEX IF NOT EXISTS orders_awb_idx ON public.orders(awb_number) WHERE awb_number IS NOT NULL;

-- 3. UPDATE STATUS CHECK CONSTRAINT TO INCLUDE 'processing'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
  END IF;

  ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
