import { createClient } from '@supabase/supabase-js';
import { products as staticProducts } from '../data/products.ts';
import type { Product, ProductImage } from '../data/products.ts';

export class ProductQueryError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ProductQueryError';
    this.cause = cause;
  }
}

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
  size?: string | null;
  images?: ProductImage[] | string | null;
  key_ingredients?: string[] | string | null;
  benefits?: string[] | string | null;
  full_ingredients?: string | null;
  how_to_use?: string | null;
  storage?: string | null;
  caution?: string | null;
  manufacturer_details?: string | null;
  marketed_by?: string | null;
  mfg_lic_no?: string | null;
  badges?: string[] | string | null;
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
 * Checks whether Supabase is actively configured via environment variables.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    !url.includes('placeholder') &&
    url.trim().length > 0 &&
    key &&
    !key.includes('placeholder') &&
    key.trim().length > 0
  );
}

/**
 * Creates a public client for read-only catalogue queries with RLS enforced.
 * Safe for static builds and server components.
 */
function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xhjkczndewkocqwsebry.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_NL2dn8xfvLegDdqugr_kWQ_vomnUcBT';

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Privileged client used exclusively if includeUnpublished is requested in admin/test contexts.
 */
function getAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey || secretKey.includes('placeholder')) {
    return null;
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseJsonArray<T>(val: unknown, fallback: T[] = []): T[] {
  if (!val) return fallback;
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {}
  }
  return fallback;
}

/**
 * Maps an authoritative database product row to the rich storefront Product interface.
 * All product fields (images, ingredients, directions, compliance, size) are derived
 * strictly from the database row.
 */
export function mapDbProductToStorefront(
  db: DbProduct
): Product {
  const price = Number(db.price);
  const mrp = db.mrp != null ? Number(db.mrp) : price;
  const discountPercentage = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stockQuantity = Number(db.stock_quantity ?? 0);
  const inStock = stockQuantity > 0 && Boolean(db.is_active);

  // Parse images array from database row
  let images = parseJsonArray<ProductImage>(db.images);
  if (images.length === 0) {
    if (db.image_url) {
      images = [
        {
          src: db.image_url,
          webpSrcSet: `${db.image_url} 768w`,
          avifSrcSet: `${db.image_url} 768w`,
          alt: db.name,
          width: 768,
          height: 768,
          blurDataURL: '',
        },
      ];
    } else {
      images = [
        {
          src: '/images/hydroboost-moisturizer-lifestyle-768.webp',
          webpSrcSet: '/images/hydroboost-moisturizer-lifestyle-768.webp 768w',
          avifSrcSet: '/images/hydroboost-moisturizer-lifestyle-768.webp 768w',
          alt: db.name,
          width: 768,
          height: 768,
          blurDataURL: '',
        },
      ];
    }
  }

  // Badges array
  const badges = parseJsonArray<string>(db.badges);
  if (badges.length === 0 && db.badge) {
    badges.push(db.badge);
  }

  const keyIngredients = parseJsonArray<string>(db.key_ingredients);
  const benefits = parseJsonArray<string>(db.benefits);

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
    size: db.size || '',
    images,
    heroImageIndex: 0,
    keyIngredients,
    benefits,
    fullIngredients: db.full_ingredients || '',
    howToUse: db.how_to_use || '',
    storage: db.storage || undefined,
    complianceNote:
      db.caution ||
      'Individual results may vary. For external use only. Do a patch test before first use.',
    manufacturerDetails: db.manufacturer_details || 'Trassally International Pvt. Ltd.',
    marketedBy: db.marketed_by || "Dr Ria's, 93-c Shastri Nagar, Jammu 180004",
    mfgLicNo: db.mfg_lic_no || undefined,
    badges,
    description: db.description || '',
    inStock,
    stockQuantity,
    hsnCode: db.hsn_code || '330499',
    taxRate: Number(db.tax_rate ?? 18),
    isActive: Boolean(db.is_active),
  };
}

/**
 * Asynchronously loads all products from Supabase.
 * By default filters for is_active = true and deleted_at IS NULL (storefront view).
 * Admin callers can pass includeUnpublished: true to retrieve the complete inventory.
 *
 * When Supabase environment variables are configured, failures throw ProductQueryError (fail-closed).
 * data/products.ts is used ONLY when Supabase credentials are completely absent.
 */
export async function getAllProducts(options?: {
  includeUnpublished?: boolean;
}): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    try {
      let supabase = getPublicSupabase();
      if (options?.includeUnpublished) {
        const adminClient = getAdminSupabaseClient();
        if (adminClient) {
          supabase = adminClient;
        }
      }

      let query = supabase.from('products').select('*').is('deleted_at', null);

      if (!options?.includeUnpublished) {
        query = query.eq('is_active', true);
      }

      query = query.order('created_at', { ascending: true });
      const { data, error } = await query;

      if (error) {
        console.error('[Product Fetch Error]', error.message);
        throw new ProductQueryError(`Failed to fetch products from Supabase: ${error.message}`, error);
      }

      if (!data) {
        return [];
      }

      return (data as DbProduct[]).map((row) => mapDbProductToStorefront(row));
    } catch (err) {
      if (err instanceof ProductQueryError) {
        throw err;
      }
      console.error('[Product Fetch Exception]', err instanceof Error ? err.message : err);
      throw new ProductQueryError('Product catalogue service unavailable', err);
    }
  }

  // Supabase environment variables are absent (local dev without .env / mock mode)
  return staticProducts
    .filter((p) => (options?.includeUnpublished ? true : p.slug !== 'hair-growth-oil'))
    .map((p) => {
      const price = p.price;
      const mrp = p.mrp != null ? p.mrp : price;
      const discountPercentage =
        p.discountPercentage != null
          ? p.discountPercentage
          : mrp > price
          ? Math.round(((mrp - price) / mrp) * 100)
          : 0;

      return {
        ...p,
        mrp,
        discountPercentage,
        isActive: p.slug !== 'hair-growth-oil',
        inStock: p.slug !== 'hair-growth-oil',
      };
    });
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
 * Synchronous validator for product slug format (lowercase letters, digits, hyphens, max 80 chars).
 * No dependency on static catalogue data.
 */
export function isValidProductSlug(slug: string): boolean {
  if (typeof slug !== 'string') return false;
  return slug.length >= 1 && slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
