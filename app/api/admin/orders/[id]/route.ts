import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminApi, requireRecentAuth } from '@/lib/admin-auth';
import { queryDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';

const updateOrderSchema = z.object({
  status: z
    .enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])
    .optional(),
  courier_name: z.string().max(100).optional().nullable(),
  awb_number: z.string().max(100).optional().nullable(),
  tracking_url: z.string().max(500).optional().nullable(),
  cancellation_reason: z.string().max(500).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  const { id } = await params;

  try {
    const orderRes = await queryDb(
      `SELECT * FROM public.orders WHERE id = $1 LIMIT 1;`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const itemsRes = await queryDb(
      `SELECT * FROM public.order_items WHERE order_id = $1 ORDER BY id ASC;`,
      [id]
    );

    const order = {
      ...orderRes.rows[0],
      items: itemsRes.rows,
    };

    return NextResponse.json({ order });
  } catch (err: unknown) {
    console.error('[Admin Order Details GET Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  // Enforce recent MFA verification for administrative order modifications
  const hasRecentMfa = await requireRecentAuth(10, { userId: auth.user.id });
  if (!hasRecentMfa) {
    return NextResponse.json(
      {
        error: 'Recent MFA verification required. Please complete authentication challenge.',
        code: 'mfa_step_up_required',
      },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const validation = updateOrderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message, issues: validation.error.issues },
      { status: 400 }
    );
  }

  const updates = validation.data;

  try {
    // 1. Fetch current order state for delta logging
    const currentRes = await queryDb(
      `SELECT * FROM public.orders WHERE id = $1 LIMIT 1;`,
      [id]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrder = currentRes.rows[0];

    // 2. Build dynamic UPDATE statement
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;

      // Automatically record milestone timestamps
      if (updates.status === 'shipped' && !currentOrder.shipped_at) {
        updateFields.push(`shipped_at = now()`);
      }
      if (updates.status === 'delivered' && !currentOrder.delivered_at) {
        updateFields.push(`delivered_at = now()`);
      }
    }

    if (updates.courier_name !== undefined) {
      updateFields.push(`courier_name = $${paramIndex}`);
      values.push(updates.courier_name);
      paramIndex++;
    }

    if (updates.awb_number !== undefined) {
      updateFields.push(`awb_number = $${paramIndex}`);
      values.push(updates.awb_number);
      paramIndex++;
    }

    if (updates.tracking_url !== undefined) {
      updateFields.push(`tracking_url = $${paramIndex}`);
      values.push(updates.tracking_url);
      paramIndex++;
    }

    if (updates.cancellation_reason !== undefined) {
      updateFields.push(`cancellation_reason = $${paramIndex}`);
      values.push(updates.cancellation_reason);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ order: currentOrder });
    }

    updateFields.push(`updated_at = now()`);

    const updateSql = `
      UPDATE public.orders
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    values.push(id);

    const updatedRes = await queryDb(updateSql, values);
    const updatedOrder = updatedRes.rows[0];

    // 3. Log administrative audit trail
    const ip = request.headers.get('x-forwarded-for') || null;
    await logAuditEvent({
      adminId: auth.user.id,
      action: 'order_status_updated',
      entityType: 'orders',
      entityId: id,
      oldValue: {
        status: currentOrder.status,
        courier_name: currentOrder.courier_name,
        awb_number: currentOrder.awb_number,
      },
      newValue: {
        status: updatedOrder.status,
        courier_name: updatedOrder.courier_name,
        awb_number: updatedOrder.awb_number,
        tracking_url: updatedOrder.tracking_url,
      },
      ip,
    });

    // Invalidate client and admin caches
    revalidatePath(`/account/orders/${id}`);
    revalidatePath('/admin/orders');

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (err: unknown) {
    console.error('[Admin Order PATCH Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update order' },
      { status: 500 }
    );
  }
}
