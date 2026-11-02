import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id} Details | Dr Ria's`,
    description: `Order tracking and item breakdown for order #${id}.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      <div className="h-6 w-32 bg-white/70 rounded-lg" />
      <div className="h-28 bg-white rounded-3xl border border-[#E8E0D5]" />
      <div className="h-64 bg-white rounded-3xl border border-[#E8E0D5]" />
    </div>
  );
}

async function OrderDetailContent({ params }: OrderDetailPageProps) {
  const { id: orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/account/orders/${orderId}`);
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-[#3E2914]">Order Not Found</h1>
        <p className="text-sm text-[#6B6B6B]">
          We could not find order #{orderId} under your authenticated account.
        </p>
        <Link
          href="/account"
          className="inline-block px-5 py-2.5 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors"
        >
          &larr; Return to Account
        </Link>
      </div>
    );
  }

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

  const address = order.address_snapshot || {};
  const items = order.order_items || [];

  const whatsAppText = encodeURIComponent(
    `Hello Dr Ria's! I am inquiring about my order #${order.id}.\n` +
      `Status: ${order.status.toUpperCase()}\n` +
      `Total: ₹${order.total.toLocaleString('en-IN')}\n` +
      `Recipient: ${address.name || user.email}`
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-semibold text-[#5C3D1E] hover:underline gap-1.5"
        >
          &larr; Back to Order History
        </Link>
      </div>

      {/* Order Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E0D5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Order Confirmation
          </span>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E2914]">
              #{order.id}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B]">
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/919469088317?text=${whatsAppText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EDF6EE] border border-[#3A7D44] text-[#3A7D44] text-xs font-semibold hover:bg-[#DDF0DF] transition-colors"
          >
            Order Support on WhatsApp
          </a>
        </div>
      </div>

      {/* Order Items List */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-6">
        <h2 className="font-serif text-xl font-bold text-[#3E2914] pb-3 border-b border-[#F3EBDD]">
          Purchased Formulations ({items.length})
        </h2>

        <div className="divide-y divide-[#F3EBDD]">
          {items.map((item: any) => (
            <div
              key={item.id || item.product_slug}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <Link
                  href={`/products/${item.product_slug}`}
                  className="font-serif text-sm font-bold text-[#1A1A1A] hover:text-[#5C3D1E] hover:underline"
                >
                  {item.product_name}
                </Link>
                <p className="text-[#6B6B6B]">
                  Quantity: {item.quantity} &bull; Unit Price: ₹
                  {item.unit_price.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="font-serif text-base font-bold text-[#5C3D1E]">
                  ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Breakdown */}
        <div className="pt-4 border-t border-[#F3EBDD] space-y-2 text-xs">
          <div className="flex justify-between text-[#6B6B6B]">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-[#6B6B6B]">
            <span>Delivery Charges</span>
            <span className="text-[#3A7D44] font-medium">
              {order.shipping === 0 ? 'Free (Standard Pan-India)' : `₹${order.shipping}`}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#1A1A1A] pt-3 border-t border-[#F3EBDD]">
            <span>Total Paid</span>
            <span className="text-[#5C3D1E]">₹{order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Delivery & Payment Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="bg-white p-6 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-3">
          <h3 className="font-serif text-base font-bold text-[#3E2914]">
            Shipping Address
          </h3>
          <div className="text-xs text-[#4A4A4A] space-y-1 leading-relaxed">
            <p className="font-semibold text-[#1A1A1A]">{address.name || 'Recipient'}</p>
            {address.phone && <p>Phone: {address.phone}</p>}
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>
              {address.city}, {address.state} - {address.pincode}
            </p>
          </div>
        </div>

        {/* Payment & Security Snapshot */}
        <div className="bg-white p-6 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-3">
          <h3 className="font-serif text-base font-bold text-[#3E2914]">
            Payment Information
          </h3>
          <div className="text-xs text-[#4A4A4A] space-y-2 leading-relaxed">
            <div>
              <span className="text-[#6B6B6B]">Payment Status: </span>
              <span className="font-semibold uppercase text-[#3A7D44]">
                {order.status === 'paid' ? 'Verified Online Payment' : order.status}
              </span>
            </div>
            {order.razorpay_payment_id && (
              <div>
                <span className="text-[#6B6B6B]">Razorpay Transaction ID: </span>
                <span className="font-mono font-medium text-[#1A1A1A] break-all">
                  {order.razorpay_payment_id}
                </span>
              </div>
            )}
            {order.razorpay_order_id && (
              <div>
                <span className="text-[#6B6B6B]">Gateway Reference: </span>
                <span className="font-mono text-[#6B6B6B] break-all">
                  {order.razorpay_order_id}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-[#F3EBDD] text-[11px] text-[#6B6B6B]">
              Transactions are encrypted and processed through RBI-authorized payment gateways.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <main className="min-h-screen bg-[#FBF6EE] py-10 sm:py-16">
      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailContent params={params} />
      </Suspense>
    </main>
  );
}
