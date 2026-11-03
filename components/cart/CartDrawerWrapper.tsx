'use client';

import dynamic from 'next/dynamic';
import { useCartStore } from '@/lib/cart';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), {
  ssr: false,
});

export default function CartDrawerWrapper() {
  const isOpen = useCartStore((state) => state.isOpen);
  if (!isOpen) return null;
  return <CartDrawer />;
}
