import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllProducts } from '@/lib/products';
import ShopClient from './ShopClient';

export const metadata: Metadata = {
  title: 'Shop All Formulations',
  description:
    'Explore the full range of skincare, haircare, and sun protection formulations by Dr Ria’s.',
  openGraph: {
    title: "Shop All Formulations | Dr Ria's",
    description:
      'Targeted active ingredients, honest formulations, and transparent cosmetic details.',
  },
};

export default async function ShopPage() {
  'use cache';
  const products = await getAllProducts();

  return (
    <div className="py-12 sm:py-16 bg-[#FBF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            The Apothecary
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3E2914] mt-1">
            Shop All Formulations
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Formulated for hair strengthening, moisture restoration, daily brightening, and UVA/UVB defence.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-20 text-sm text-[#6B6B6B]">Loading shop catalog...</div>}>
          <ShopClient products={products} />
        </Suspense>
      </div>
    </div>
  );
}
