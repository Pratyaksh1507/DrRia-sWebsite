import React from 'react';
import { requireAdmin } from '@/lib/admin-auth';
import { queryDb } from '@/lib/db';
import AdminOrdersManager, {
  AdminOrder,
  OrderMetrics,
} from '@/components/admin/AdminOrdersManager';

export default async function AdminOrdersPage() {
  await requireAdmin();

  let initialOrders: AdminOrder[] = [];
  const initialMetrics: OrderMetrics = {
    totalOrders: 0,
    totalRevenue: 0,
    pendingFulfillment: 0,
    pendingPayment: 0,
    inTransit: 0,
    delivered: 0,
  };

  try {
    const res = await queryDb<{
      id: string;
      user_id: string | null;
      status: AdminOrder['status'];
      subtotal: number | string;
      shipping: number | string;
      total: number | string;
      address_snapshot: AdminOrder['address_snapshot'];
      razorpay_order_id: string | null;
      razorpay_payment_id: string | null;
      idempotency_key: string | null;
      courier_name: string | null;
      awb_number: string | null;
      tracking_url: string | null;
      shipped_at: string | null;
      delivered_at: string | null;
      cancellation_reason: string | null;
      created_at: Date | string;
      updated_at: Date | string;
      items: AdminOrder['items'];
    }>(
      `SELECT 
        o.id,
        o.user_id,
        o.status,
        o.subtotal,
        o.shipping,
        o.total,
        o.address_snapshot,
        o.razorpay_order_id,
        o.razorpay_payment_id,
        o.idempotency_key,
        o.courier_name,
        o.awb_number,
        o.tracking_url,
        o.shipped_at,
        o.delivered_at,
        o.cancellation_reason,
        o.created_at,
        o.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
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
          '[]'::json
        ) AS items
      FROM public.orders o
      LEFT JOIN public.order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 100;`
    );

    initialOrders = res.rows.map((r) => ({
      ...r,
      subtotal: Number(r.subtotal) || 0,
      shipping: Number(r.shipping) || 0,
      total: Number(r.total) || 0,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
    }));

    initialMetrics.totalOrders = initialOrders.length;
    for (const o of initialOrders) {
      if (['paid', 'processing', 'shipped', 'delivered'].includes(o.status)) {
        initialMetrics.totalRevenue += o.total;
      }
      if (['paid', 'processing'].includes(o.status)) {
        initialMetrics.pendingFulfillment += 1;
      } else if (o.status === 'shipped') {
        initialMetrics.inTransit += 1;
      } else if (o.status === 'delivered') {
        initialMetrics.delivered += 1;
      } else if (o.status === 'pending') {
        initialMetrics.pendingPayment += 1;
      }
    }
  } catch (err) {
    console.warn('[AdminOrdersPage] Could not query live orders from database:', err);
  }

  return (
    <AdminOrdersManager
      initialOrders={initialOrders}
      initialMetrics={initialMetrics}
    />
  );
}
