import { Suspense } from 'react';
import type { Metadata } from 'next';
import ThankYouClient from './ThankYouClient';

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Thank you for your order with Dr Ria’s.',
};

export default function ThankYouPage() {
  return (
    <div className="py-16 sm:py-24 bg-[#FBF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="text-center py-20 text-sm text-[#6B6B6B]">Loading confirmation...</div>}>
          <ThankYouClient />
        </Suspense>
      </div>
    </div>
  );
}
