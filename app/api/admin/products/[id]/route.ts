import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/admin-auth';
import { queryDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  mrp: z.number().int().min(0).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  hsn_code: z.string().min(2).optional(),
  tax_rate: z
    .number()
    .refine((val) => [0, 5, 12, 18, 28].includes(val), {
      message: 'GST rate must be 0, 5, 12, 18, or 28',
    })
    .optional(),
  is_active: z.boolean().optional(),
  badge: z.string().optional(),
  image_url: z.string().optional(),
  category: z.enum(['lips', 'skin', 'hair', 'sun']).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
  }

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates = parsed.data;
  const ip = request.headers.get('x-forwarded-for') || null;

  try {
    // 1. Fetch current product record
    const currentRes = await queryDb(
      `SELECT * FROM public.products WHERE id = $1 LIMIT 1;`,
      [id]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const current = currentRes.rows[0];

    // 2. Validate price vs MRP constraint
    const finalPrice = updates.price !== undefined ? updates.price : current.price;
    const finalMrp = updates.mrp !== undefined ? updates.mrp : current.mrp;

    if (finalMrp < finalPrice) {
      return NextResponse.json(
        { error: `MRP (₹${finalMrp}) cannot be less than selling price (₹${finalPrice})` },
        { status: 400 }
      );
    }

    // 3. Build dynamic UPDATE SQL
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: true, product: current });
    }

    setClauses.push(`updated_at = now()`);
    values.push(id);

    const updateSql = `
      UPDATE public.products
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const updatedRes = await queryDb(updateSql, values);
    const updated = updatedRes.rows[0];

    // 4. Audit sensitive changes
    // Price / MRP change audit
    if (
      (updates.price !== undefined && updates.price !== current.price) ||
      (updates.mrp !== undefined && updates.mrp !== current.mrp)
    ) {
      await logAuditEvent({
        adminId: auth.user.id,
        action: 'product_price_updated',
        entityType: 'products',
        entityId: id,
        oldValue: { price: current.price, mrp: current.mrp },
        newValue: { price: updated.price, mrp: updated.mrp },
        ip,
      });
    }

    // Inventory stock change audit
    if (
      updates.stock_quantity !== undefined &&
      updates.stock_quantity !== current.stock_quantity
    ) {
      await logAuditEvent({
        adminId: auth.user.id,
        action: 'product_inventory_updated',
        entityType: 'products',
        entityId: id,
        oldValue: { stock_quantity: current.stock_quantity },
        newValue: { stock_quantity: updated.stock_quantity },
        ip,
      });
    }

    // Tax rate / HSN code change audit
    if (
      (updates.tax_rate !== undefined && Number(updates.tax_rate) !== Number(current.tax_rate)) ||
      (updates.hsn_code !== undefined && updates.hsn_code !== current.hsn_code)
    ) {
      await logAuditEvent({
        adminId: auth.user.id,
        action: 'product_tax_updated',
        entityType: 'products',
        entityId: id,
        oldValue: { tax_rate: current.tax_rate, hsn_code: current.hsn_code },
        newValue: { tax_rate: updated.tax_rate, hsn_code: updated.hsn_code },
        ip,
      });
    }

    // Status (published / unpublished) change audit
    if (updates.is_active !== undefined && updates.is_active !== current.is_active) {
      await logAuditEvent({
        adminId: auth.user.id,
        action: 'product_status_updated',
        entityType: 'products',
        entityId: id,
        oldValue: { is_active: current.is_active },
        newValue: { is_active: updated.is_active },
        ip,
      });
    }

    // General update audit if only descriptions or names changed
    if (
      updates.name !== undefined ||
      updates.description !== undefined ||
      updates.tagline !== undefined ||
      updates.image_url !== undefined
    ) {
      await logAuditEvent({
        adminId: auth.user.id,
        action: 'product_updated',
        entityType: 'products',
        entityId: id,
        oldValue: { name: current.name, tagline: current.tagline, image_url: current.image_url },
        newValue: { name: updated.name, tagline: updated.tagline, image_url: updated.image_url },
        ip,
      });
    }

    // 5. Purge Next.js static / SSR caches immediately
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/shop');
      revalidatePath(`/products/${updated.slug}`);
    } catch {}

    return NextResponse.json({ success: true, product: updated });
  } catch (err: unknown) {
    console.error('[Admin Product Update Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database update error' },
      { status: 500 }
    );
  }
}

