'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ThankYouClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'DRRIA-849201';
  const method = searchParams.get('method') || 'online';
  const paymentId = searchParams.get('paymentId');

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-[#E8E0D5] shadow-xs text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-[#EDF6EE] text-[#3A7D44] flex items-center justify-center mx-auto text-2xl font-bold border border-[#C5E5C9]">
        ✓
      </div>

      <div>
        <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
          Order Confirmed
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3E2914] mt-1">
          Thank You for Trusting Dr Ria&apos;s
        </h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Your order has been placed successfully and is being prepared for dispatch.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E0D5] text-left text-xs sm:text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Order Number:</span>
          <span className="font-mono font-bold text-[#5C3D1E]">{orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Payment Mode:</span>
          <span className="font-semibold text-[#1A1A1A]">
            {method === 'cod' ? 'Cash on Delivery' : 'Paid Online (Razorpay)'}
          </span>
        </div>
        {paymentId && (
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Transaction ID:</span>
            <span className="font-mono text-[11px] text-[#6B6B6B]">{paymentId}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Estimated Delivery:</span>
          <span className="font-semibold text-[#3A7D44]">3 - 5 Business Days</span>
        </div>
      </div>

      <p className="text-xs text-[#6B6B6B] leading-relaxed">
        A confirmation SMS/WhatsApp update with live tracking will be sent as soon as your package leaves our facility.
      </p>

      <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={`https://wa.me/919469088317?text=${encodeURIComponent(
            `Hi Dr Ria's! I just placed order #${orderId}. Please share tracking updates.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3A7D44] text-white text-xs font-semibold hover:bg-[#306637] transition-colors"
        >
          <span>Track via WhatsApp Support</span>
        </a>

        <Link
          href="/shop"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-[#5C3D1E] text-[#5C3D1E] text-xs font-semibold hover:bg-[#F3EBDD] transition-colors"
        >
          <span>Continue Shopping</span>
        </Link>
      </div>
    </div>
  );
}
