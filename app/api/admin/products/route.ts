import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/admin-auth';
import { queryDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';

const createProductSchema = z
  .object({
    name: z.string().min(2, 'Product name is required'),
    slug: z
      .string()
      .min(2, 'Slug is required')
      .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'),
    category: z.enum(['lips', 'skin', 'hair', 'sun']),
    tagline: z.string().optional().default(''),
    description: z.string().optional().default(''),
    price: z.number().int().min(0, 'Selling price must be greater than or equal to 0'),
    mrp: z.number().int().min(0, 'MRP must be greater than or equal to 0'),
    stock_quantity: z.number().int().min(0, 'Inventory stock quantity must be at least 0'),
    hsn_code: z.string().min(2, 'Valid HSN code required'),
    tax_rate: z.number().refine((val) => [0, 5, 12, 18, 28].includes(val), {
      message: 'GST rate must be 0, 5, 12, 18, or 28',
    }),
    is_active: z.boolean().default(false),
    badge: z.string().optional().default(''),
    image_url: z.string().optional().default(''),
  })
  .refine((data) => data.mrp >= data.price, {
    message: 'MRP must be greater than or equal to the selling price',
    path: ['mrp'],
  });

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  try {
    const res = await queryDb(
      `SELECT * FROM public.products ORDER BY created_at DESC;`
    );
    return NextResponse.json({ products: res.rows });
  } catch (err: unknown) {
    console.error('[Admin Products GET Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const ip = request.headers.get('x-forwarded-for') || null;

  try {
    // 1. Verify slug uniqueness
    const slugCheck = await queryDb(
      `SELECT id FROM public.products WHERE slug = $1 LIMIT 1;`,
      [data.slug]
    );

    if (slugCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `Product with slug "${data.slug}" already exists.` },
        { status: 409 }
      );
    }

    // 2. Insert new product
    const insertRes = await queryDb(
      `INSERT INTO public.products (
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
        image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        data.slug,
        data.name,
        data.category,
        data.tagline || null,
        data.description || null,
        data.price,
        data.mrp,
        data.stock_quantity,
        data.hsn_code,
        data.tax_rate,
        data.is_active,
        data.badge || null,
        data.image_url || null,
      ]
    );

    const newProduct = insertRes.rows[0];

    // 3. Durable audit log
    await logAuditEvent({
      adminId: auth.user.id,
      action: 'product_created',
      entityType: 'products',
      entityId: newProduct.id,
      newValue: {
        id: newProduct.id,
        name: newProduct.name,
        slug: newProduct.slug,
        price: newProduct.price,
        mrp: newProduct.mrp,
        stock_quantity: newProduct.stock_quantity,
        hsn_code: newProduct.hsn_code,
        tax_rate: newProduct.tax_rate,
        is_active: newProduct.is_active,
      },
      ip,
    });

    // 4. Instant cache purge
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/shop');
      revalidatePath(`/products/${newProduct.slug}`);
    } catch {}

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Admin Product Create Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database insertion error' },
      { status: 500 }
    );
  }
}

