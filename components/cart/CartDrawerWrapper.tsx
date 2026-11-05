'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/lib/cart';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), {
  ssr: false,
});

export default function CartDrawerWrapper() {
  const pathname = usePathname();
  const isOpen = useCartStore((state) => state.isOpen);
  if (pathname?.startsWith('/admin') || !isOpen) return null;
  return <CartDrawer />;
}
