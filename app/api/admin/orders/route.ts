import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { queryDb } from '@/lib/db';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  try {
    const whereConditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      whereConditions.push(`o.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereConditions.push(`(
        o.id ILIKE $${paramIndex}
        OR o.address_snapshot->>'name' ILIKE $${paramIndex}
        OR o.address_snapshot->>'phone' ILIKE $${paramIndex}
        OR o.address_snapshot->>'city' ILIKE $${paramIndex}
        OR o.awb_number ILIKE $${paramIndex}
      )`);
      queryParams.push(term);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query orders with aggregated line items
    const ordersQuery = `
      SELECT 
        o.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_slug', oi.product_slug,
              'product_name', oi.product_name,
              'unit_price', oi.unit_price,
              'quantity', oi.quantity,
              'tax_rate', oi.tax_rate,
              'taxable_amount', oi.taxable_amount,
              'tax_amount', oi.tax_amount
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::jsonb
        ) as items
      FROM public.orders o
      LEFT JOIN public.order_items oi ON oi.order_id = o.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const ordersRes = await queryDb(ordersQuery, [...queryParams, limit, offset]);

    // Summary metrics for the doctor's dashboard cards
    const metricsRes = await queryDb(`
      SELECT
        COUNT(*)::int as total_orders,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'processing', 'shipped', 'delivered') THEN total ELSE 0 END), 0)::bigint as total_revenue,
        COUNT(CASE WHEN status IN ('paid', 'processing') THEN 1 END)::int as pending_fulfillment,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_payment,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END)::int as in_transit,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END)::int as delivered
      FROM public.orders;
    `);

    const metrics = metricsRes.rows[0] || {
      total_orders: 0,
      total_revenue: 0,
      pending_fulfillment: 0,
      pending_payment: 0,
      in_transit: 0,
      delivered: 0,
    };

    return NextResponse.json({
      orders: ordersRes.rows,
      metrics: {
        totalOrders: Number(metrics.total_orders || 0),
        totalRevenue: Number(metrics.total_revenue || 0),
        pendingFulfillment: Number(metrics.pending_fulfillment || 0),
        pendingPayment: Number(metrics.pending_payment || 0),
        inTransit: Number(metrics.in_transit || 0),
        delivered: Number(metrics.delivered || 0),
      },
      limit,
      offset,
    });
  } catch (err: unknown) {
    console.error('[Admin Orders GET Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
