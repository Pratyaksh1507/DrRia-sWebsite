import { createClient } from '@supabase/supabase-js';
import { products as staticProducts } from '../data/products.ts';
import type { Product, ProductImage } from '../data/products.ts';

export interface DbProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  description: string | null;
  price: number;
  mrp: number;
  stock_quantity: number;
  hsn_code: string;
  tax_rate: number | string;
  is_active: boolean;
  deleted_at: string | null;
  badge: string | null;
  image_url: string | null;
  rating: number | string | null;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

// Category design helpers matching brand guidelines
export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'lips':
      return 'Lip Care';
    case 'skin':
      return 'Facial Care';
    case 'hair':
      return 'Hair Care';
    case 'sun':
      return 'Sun Care';
    default:
      return 'Cosmetic Formulation';
  }
}

export function getCategoryAccent(category: string): string {
  switch (category) {
    case 'lips':
      return '#4A7FA5';
    case 'skin':
      return '#E8651A';
    case 'hair':
      return '#C9952A';
    case 'sun':
      return '#3A7D44';
    default:
      return '#5C3D1E';
  }
}

/**
 * Creates a public client for read-only catalogue queries.
 * Safe for static builds and server components.
 */
function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xhjkczndewkocqwsebry.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_NL2dn8xfvLegDdqugr_kWQ_vomnUcBT';

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Maps a database product row to the rich storefront Product interface.
 * Merges authoritative database pricing, inventory, tax, and status
 * with static layout assets (multi-angle responsive images, ingredients, directions).
 */
export function mapDbProductToStorefront(
  db: DbProduct,
  staticMatch?: Product
): Product {
  const price = Number(db.price);
  const mrp = Number(db.mrp);
  const discountPercentage = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stockQuantity = Number(db.stock_quantity);
  const inStock = stockQuantity > 0 && db.is_active;

  if (staticMatch) {
    return {
      ...staticMatch,
      id: db.id,
      slug: db.slug,
      name: db.name || staticMatch.name,
      tagline: db.tagline || staticMatch.tagline,
      description: db.description || staticMatch.description,
      price,
      mrp,
      discountPercentage,
      stockQuantity,
      inStock,
      hsnCode: db.hsn_code,
      taxRate: Number(db.tax_rate),
      isActive: db.is_active,
      badges: db.badge ? [db.badge, ...(staticMatch.badges?.slice(1) || [])] : staticMatch.badges,
      images:
        db.image_url && db.image_url !== staticMatch.images[0]?.src
          ? [
              {
                src: db.image_url,
                webpSrcSet: `${db.image_url} 768w`,
                avifSrcSet: `${db.image_url} 768w`,
                alt: db.name,
                width: 768,
                height: 768,
                blurDataURL: staticMatch.images[0]?.blurDataURL || '',
              },
              ...staticMatch.images.slice(1),
            ]
          : staticMatch.images,
    };
  }

  // Newly created product from admin with default storefront fallbacks
  const primaryImage: ProductImage = {
    src: db.image_url || '/images/hydroboost-moisturizer-lifestyle-768.webp',
    webpSrcSet: `${db.image_url || '/images/hydroboost-moisturizer-lifestyle-768.webp'} 768w`,
    avifSrcSet: `${db.image_url || '/images/hydroboost-moisturizer-lifestyle-768.webp'} 768w`,
    alt: db.name,
    width: 768,
    height: 768,
    blurDataURL: '',
  };

  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    tagline: db.tagline || '',
    category: (['lips', 'skin', 'hair', 'sun'].includes(db.category)
      ? db.category
      : 'skin') as Product['category'],
    categoryLabel: getCategoryLabel(db.category),
    accentColor: getCategoryAccent(db.category),
    price,
    mrp,
    discountPercentage,
    size: '',
    images: [primaryImage],
    heroImageIndex: 0,
    keyIngredients: [],
    benefits: [],
    fullIngredients: '',
    howToUse: '',
    complianceNote:
      'Individual results may vary. For external use only. Do a patch test before first use.',
    manufacturerDetails: 'Trassally International Pvt. Ltd.',
    marketedBy: "Dr Ria's, 93-c Shastri Nagar, Jammu 180004",
    badges: db.badge ? [db.badge] : [],
    description: db.description || '',
    inStock,
    stockQuantity,
    hsnCode: db.hsn_code,
    taxRate: Number(db.tax_rate),
    isActive: db.is_active,
  };
}

/**
 * Asynchronously loads all products from Supabase.
 * By default filters for is_active = true and deleted_at IS NULL (storefront view).
 * Admin callers can pass includeUnpublished: true to retrieve the complete inventory.
 */
export async function getAllProducts(options?: {
  includeUnpublished?: boolean;
}): Promise<Product[]> {
  try {
    let rows: DbProduct[] = [];

    // For admin callers requesting unpublished products, query database directly via PostgreSQL pool
    let connStr = process.env.DATABASE_URL;
    if (!connStr && typeof window === 'undefined') {
      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.+)$/m);
          if (match) connStr = match[1].trim();
        }
      } catch {}
    }

    if (options?.includeUnpublished && connStr) {
      try {
        const { default: pg } = await import('pg');
        const pool = new pg.Pool({
          connectionString: connStr,
          ssl: { rejectUnauthorized: false },
        });
        const dbRes = await pool.query(
          `SELECT * FROM public.products WHERE deleted_at IS NULL ORDER BY created_at ASC;`
        );
        await pool.end();
        rows = dbRes.rows as DbProduct[];
      } catch (poolErr) {
        console.warn('[Admin DB Pool Fallback]', poolErr);
      }
    }

    // Storefront queries use the public client with RLS
    if (rows.length === 0) {
      const supabase = getPublicSupabase();
      let query = supabase.from('products').select('*').is('deleted_at', null);

      if (!options?.includeUnpublished) {
        query = query.eq('is_active', true);
      }

      query = query.order('created_at', { ascending: true });
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        rows = data as DbProduct[];
      }
    }

    if (rows.length === 0) {
      // Graceful fallback to static products
      return staticProducts
        .filter((p) => (options?.includeUnpublished ? true : p.slug !== 'hair-growth-oil'))
        .map((p) => ({
          ...p,
          isActive: p.slug !== 'hair-growth-oil',
          inStock: p.slug !== 'hair-growth-oil',
        }));
    }

    const staticMap = new Map(staticProducts.map((p) => [p.slug, p]));
    return rows.map((row) =>
      mapDbProductToStorefront(row, staticMap.get(row.slug))
    );
  } catch (err) {
    console.warn('[Product Fetch Fallback]', err);
    return staticProducts
      .filter((p) => (options?.includeUnpublished ? true : p.slug !== 'hair-growth-oil'))
      .map((p) => ({
        ...p,
        isActive: p.slug !== 'hair-growth-oil',
        inStock: p.slug !== 'hair-growth-oil',
      }));
  }
}

/**
 * Retrieves a single product by slug from Supabase.
 * If the product is unpublished, only returns it if includeUnpublished is true.
 */
export async function getProductBySlug(
  slug: string,
  options?: { includeUnpublished?: boolean }
): Promise<Product | undefined> {
  const all = await getAllProducts(options);
  return all.find((p) => p.slug === slug);
}

/**
 * Returns products in a specified category.
 */
export async function getProductsByCategory(
  category: string,
  options?: { includeUnpublished?: boolean }
): Promise<Product[]> {
  const all = await getAllProducts(options);
  if (category === 'all') return all;
  return all.filter((p) => p.category === category);
}

/**
 * Returns related products, excluding the current slug.
 */
export async function getRelatedProducts(
  currentSlug: string,
  count = 3
): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.slug !== currentSlug).slice(0, count);
}

/**
 * Synchronous validator for known catalog slugs (e.g. used by cart validation schemas).
 */
export function isValidProductSlug(slug: string): boolean {
  return staticProducts.some((p) => p.slug === slug);
}
