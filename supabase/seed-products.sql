-- =============================================================================
-- DR RIA'S E-COMMERCE PLATFORM — PRODUCT CATALOGUE SEED
-- =============================================================================
-- Migration / Seed Script: supabase/seed-products.sql
-- Description:
-- Populates public.products with Dr Ria's 5 verified catalogue items.
--
-- IDEMPOTENCY & DATA PRESERVATION:
-- Uses ON CONFLICT (slug) DO NOTHING to guarantee that rerunning this seed
-- will NEVER overwrite administrator-edited selling prices, MRPs, inventory
-- stock quantities, or custom tax classifications.
--
-- TAX CLASSIFICATION & PUBLISHING NOTICE:
-- - Skincare items (lip balm, face wash, moisturizer, sunscreen) hold cosmetic
--   manufacturing credentials and are classified under HSN 3304 @ 18% GST (published).
-- - Hair Growth Oil is marked is_active = false (UNPUBLISHED) pending business
--   and accountant confirmation of AYUSH licensing (HSN 3004 @ 12% vs HSN 3305 @ 18%).
-- =============================================================================

INSERT INTO public.products (
  id,
  slug,
  name,
  category,
  tagline,
  description,
  price,
  mrp,
  stock_quantity,
  hsn_code,
  tax_rate,
  is_active,
  badge,
  image_url,
  rating,
  reviews_count
) VALUES
(
  'a1000000-0000-4000-8000-000000000001',
  'anti-pigmentation-lip-balm',
  'Anti Pigmentation Lip Balm',
  'lips',
  'Deep Moisture & Lip Protection',
  'Lip care formulated to provide deep moisture, nourishing care, and smoother-looking lips with botanical butters and gentle actives.',
  333,
  333,
  100,
  '3304', -- HSN 3304: Beauty or make-up preparations for skin/lips
  18.00,  -- Standard GST rate 18%
  true,   -- Published
  'Natural Butters',
  '/images/lip-balm-jar-768.webp',
  4.80,
  128
),
(
  'a1000000-0000-4000-8000-000000000002',
  'vita-c-daily-glow-face-wash',
  'Vita C Daily Glow Face Wash',
  'skin',
  'Brightens & Refreshes Natural Glow',
  'A gentle brightening daily cleanser crafted with Sodium Ascorbyl Phosphate and Orange Peel extract to wash away impurities without stripping essential moisture.',
  444,
  444,
  100,
  '3304', -- HSN 3304: Skin cleansing preparations
  18.00,  -- Standard GST rate 18%
  true,   -- Published
  'Daily Glow',
  '/images/vita-c-face-wash-lifestyle-768.webp',
  4.85,
  94
),
(
  'a1000000-0000-4000-8000-000000000003',
  'hair-growth-oil',
  'Hair Growth Oil',
  'hair',
  'Advanced Hair Strengthening Formula',
  'Crafted with natural actives that nourish the scalp and strengthen roots.',
  411,
  411,
  100,
  '3305', -- HSN 3305: Preparations for use on the hair (Pending accountant AYUSH review)
  18.00,  -- Standard GST rate 18%
  false,  -- UNPUBLISHED: Tax classification requiring accountant confirmation
  'Paraben Free',
  '/images/hair-growth-oil-lifestyle-768.webp',
  4.90,
  215
),
(
  'a1000000-0000-4000-8000-000000000004',
  'hydroboost-face-moisturizer',
  'Hydroboost Face Moisturizer',
  'skin',
  'Repair, Regenerate, Restore',
  'An ultra-hydrating daily facial cream powered by Hyaluronic Acid, Ceramides, and Peptides to restore the moisture barrier and lock in intense hydration.',
  444,
  444,
  100,
  '3304', -- HSN 3304: Skin care and moisturizers
  18.00,  -- Standard GST rate 18%
  true,   -- Published
  'Deep Hydration',
  '/images/hydroboost-moisturizer-lifestyle-768.webp',
  4.80,
  156
),
(
  'a1000000-0000-4000-8000-000000000005',
  'spf50-sunscreen',
  'SPF-50 PA+++ Sunscreen',
  'sun',
  'With Liquorice + Aloe Vera + Vitamin E',
  'High-protection broad spectrum sunscreen shielding skin from both UVA and UVB rays while deeply hydrating and brightening with botanical liquorice and aloe.',
  555,
  555,
  100,
  '3304', -- HSN 3304: Sunscreen or sun tan preparations
  18.00,  -- Standard GST rate 18%
  true,   -- Published
  'PA+++ Certified',
  '/images/spf50-sunscreen-lifestyle-768.webp',
  4.90,
  182
)
ON CONFLICT (slug) DO NOTHING;
