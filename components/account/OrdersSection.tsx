import React from 'react';
import Link from 'next/link';

export interface OrderItem {
  id: string;
  product_slug: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  created_at: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  shipping: number;
  total: number;
  address_snapshot: any;
  razorpay_payment_id?: string | null;
  order_items?: OrderItem[];
}

interface OrdersSectionProps {
  orders: Order[];
}

export default function OrdersSection({ orders }: OrdersSectionProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-[#EDF6EE] text-[#3A7D44] border-[#C5E5C9]';
      case 'shipped':
        return 'bg-[#EBF3F8] text-[#244E6E] border-[#C5DCEB]';
      case 'delivered':
        return 'bg-[#EAF5EC] text-[#2D6A4F] border-[#B7E4C7]';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-[#FAF5EA] text-[#7A532B] border-[#E8E0D5]';
    }
  };

  return (
    <div id="orders" className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-6">
      <div>
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3E2914]">
          Order History
        </h2>
        <p className="mt-1 text-xs text-[#6B6B6B]">
          Track fulfillment status, view invoices, and review past purchases.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#E8E0D5] rounded-2xl p-6 space-y-3">
          <p className="text-sm text-[#6B6B6B]">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/shop"
            className="inline-block px-6 py-2.5 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors"
          >
            Explore Formulations
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl border border-[#E8E0D5] bg-[#FDFBF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#5C3D1E]/40 transition-all shadow-2xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#1A1A1A]">
                    #{order.id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B]">
                  Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                {order.order_items && order.order_items.length > 0 && (
                  <p className="text-xs text-[#5C3D1E] font-medium line-clamp-1">
                    {order.order_items.map((i) => `${i.product_name} (×${i.quantity})`).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E8E0D5] gap-3">
                <span className="font-serif text-lg font-bold text-[#5C3D1E]">
                  ₹{order.total.toLocaleString('en-IN')}
                </span>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="px-4 py-1.5 rounded-xl border border-[#5C3D1E] text-[#5C3D1E] text-xs font-semibold hover:bg-[#5C3D1E] hover:text-white transition-colors"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

