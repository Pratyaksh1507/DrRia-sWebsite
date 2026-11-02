'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/data/products';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, qty?: number) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.slug === product.slug);
          if (existing) {
            return {
              isOpen: true,
              items: state.items.map((i) =>
                i.product.slug === product.slug
                  ? { ...i, quantity: Math.min(10, i.quantity + qty) }
                  : i
              ),
            };
          }
          return {
            isOpen: true,
            items: [...state.items, { product, quantity: qty }],
          };
        }),
      removeItem: (slug) =>
        set((state) => ({ items: state.items.filter((i) => i.product.slug !== slug) })),
      updateQuantity: (slug, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.product.slug !== slug)
              : state.items.map((i) =>
                  i.product.slug === slug ? { ...i, quantity: Math.min(10, qty) } : i
                ),
        })),
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      total: () => get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'drrias-cart-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      skipHydration: true,
    }
  )
);
