'use client';

import { create } from 'zustand';
import type { Product } from '@/data/products';
import { GUEST_CART_PERSISTENCE, CART_ON_LOGIN } from '@/config/site';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartUser {
  id: string;
  email?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  currentUser: CartUser | null;
  restoreMessage: string | null;
  droppedNotice: string | null;

  // Actions
  addItem: (product: Product, qty?: number) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: () => number;
  itemCount: () => number;

  setRestoreMessage: (msg: string | null) => void;
  setDroppedNotice: (msg: string | null) => void;
  initializeCart: () => Promise<void>;
  syncOnLogin: (user: CartUser) => Promise<void>;
  resetOnLogout: () => void;
}

const GUEST_STORAGE_KEY = 'drrias-guest-cart';
const OAUTH_PENDING_KEY = 'drrias-oauth-pending-cart';

// In-memory fallback if sessionStorage is unavailable
let memoryCart: CartItem[] = [];

// Debounce timer for saving to server
let serverSyncTimer: NodeJS.Timeout | null = null;

function saveGuestCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  if (GUEST_CART_PERSISTENCE === 'session') {
    try {
      window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
    } catch {
      memoryCart = items;
    }
  } else {
    memoryCart = items;
  }
}

function loadGuestCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  if (GUEST_CART_PERSISTENCE === 'session') {
    try {
      // Check for OAuth preserved cart first
      const pendingOauth = window.sessionStorage.getItem(OAUTH_PENDING_KEY);
      if (pendingOauth) {
        window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
        const parsed = JSON.parse(pendingOauth);
        if (Array.isArray(parsed)) return parsed;
      }

      const stored = window.sessionStorage.getItem(GUEST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      return memoryCart;
    }
  }
  return memoryCart;
}

function clearGuestStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
    window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
    // Explicitly clean up any old legacy localStorage keys to satisfy guest privacy rules
    window.localStorage.removeItem('drrias-cart-storage');
  } catch {}
  memoryCart = [];
}

/**
 * Save current cart before leaving for Google OAuth redirect
 */
export function saveCartBeforeOAuth(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(items));
    window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * Debounced push to server for authenticated users (800ms)
 */
function debounceSyncServerCart(items: CartItem[], user: CartUser | null) {
  if (!user || typeof window === 'undefined') return;

  if (serverSyncTimer) {
    clearTimeout(serverSyncTimer);
  }

  serverSyncTimer = setTimeout(async () => {
    try {
      await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.product.slug,
            quantity: i.quantity,
          })),
        }),
      });
    } catch (err) {
      console.warn('[Cart Server Sync]', err);
    }
  }, 800);
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  isHydrated: false,
  currentUser: null,
  restoreMessage: null,
  droppedNotice: null,

  setRestoreMessage: (msg) => set({ restoreMessage: msg }),
  setDroppedNotice: (msg) => set({ droppedNotice: msg }),

  addItem: (product, qty = 1) => {
    const state = get();
    const existing = state.items.find((i) => i.product.slug === product.slug);
    let newItems: CartItem[];

    if (existing) {
      newItems = state.items.map((i) =>
        i.product.slug === product.slug
          ? { ...i, quantity: Math.min(10, i.quantity + qty) }
          : i
      );
    } else {
      newItems = [...state.items, { product, quantity: Math.min(10, qty) }];
    }

    set({ isOpen: true, items: newItems });

    if (state.currentUser) {
      debounceSyncServerCart(newItems, state.currentUser);
    } else {
      saveGuestCart(newItems);
    }
  },

  removeItem: (slug) => {
    const state = get();
    const newItems = state.items.filter((i) => i.product.slug !== slug);
    set({ items: newItems });

    if (state.currentUser) {
      debounceSyncServerCart(newItems, state.currentUser);
    } else {
      saveGuestCart(newItems);
    }
  },

  updateQuantity: (slug, qty) => {
    const state = get();
    let newItems: CartItem[];

    if (qty <= 0) {
      newItems = state.items.filter((i) => i.product.slug !== slug);
    } else {
      newItems = state.items.map((i) =>
        i.product.slug === slug ? { ...i, quantity: Math.min(10, qty) } : i
      );
    }

    set({ items: newItems });

    if (state.currentUser) {
      debounceSyncServerCart(newItems, state.currentUser);
    } else {
      saveGuestCart(newItems);
    }
  },

  clearCart: () => {
    const state = get();
    set({ items: [] });
    if (state.currentUser) {
      debounceSyncServerCart([], state.currentUser);
    } else {
      clearGuestStorage();
    }
  },

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  total: () =>
    get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),

  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  /**
   * Initializes the cart on app mount.
   * Checks for session user or loads guest cart from sessionStorage.
   */
  initializeCart: async () => {
    if (typeof window === 'undefined') return;

    // Remove legacy localStorage if present to ensure privacy compliance
    try {
      window.localStorage.removeItem('drrias-cart-storage');
    } catch {}

    // Check if auth client is available
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Authenticated user: load from server
        set({ currentUser: { id: user.id, email: user.email } });
        await get().syncOnLogin({ id: user.id, email: user.email });
        set({ isHydrated: true });
        return;
      }
    } catch {}

    // Guest: load from sessionStorage
    const guestItems = loadGuestCart();
    set({
      items: guestItems,
      currentUser: null,
      isHydrated: true,
    });
  },

  /**
   * Reconciles cart on user login according to CART_ON_LOGIN ("replace" | "merge")
   */
  syncOnLogin: async (user: CartUser) => {
    const currentGuestItems = get().items;
    set({ currentUser: user });

    try {
      const res = await fetch('/api/cart');
      if (!res.ok) {
        // Empty or unconfigured server cart
        clearGuestStorage();
        set({ items: [] });
        return;
      }

      const data = await res.json();
      const serverItems: CartItem[] = data.items || [];
      const droppedCount: number = data.droppedCount || 0;

      if (CART_ON_LOGIN === 'replace') {
        // Clear guest items, replace with user's saved cart
        clearGuestStorage();
        set({ items: serverItems });

        if (serverItems.length > 0) {
          set({ restoreMessage: 'Welcome back, your cart has been restored.' });
        }
      } else {
        // "merge" policy: combine guest items with server items
        const mergedMap = new Map<string, CartItem>();

        // Add server items first
        for (const item of serverItems) {
          mergedMap.set(item.product.slug, { ...item });
        }

        // Merge guest items
        for (const gItem of currentGuestItems) {
          const existing = mergedMap.get(gItem.product.slug);
          if (existing) {
            existing.quantity = Math.min(10, existing.quantity + gItem.quantity);
          } else {
            mergedMap.set(gItem.product.slug, { ...gItem });
          }
        }

        const mergedItems = Array.from(mergedMap.values());
        clearGuestStorage();
        set({ items: mergedItems });

        if (serverItems.length > 0 || currentGuestItems.length > 0) {
          set({ restoreMessage: 'Welcome back, your cart has been restored.' });
        }

        // Save merged state to server
        debounceSyncServerCart(mergedItems, user);
      }

      if (droppedCount > 0) {
        set({
          droppedNotice:
            'One or more items in your cart are no longer available and were removed.',
        });
      }
    } catch (err) {
      console.warn('[Cart Sync On Login Error]', err);
    }
  },

  /**
   * On sign out: clear cart from screen and storage immediately.
   * Prevents leaking previous customer's items on shared devices.
   */
  resetOnLogout: () => {
    if (serverSyncTimer) {
      clearTimeout(serverSyncTimer);
      serverSyncTimer = null;
    }
    clearGuestStorage();
    set({
      items: [],
      currentUser: null,
      restoreMessage: null,
      droppedNotice: null,
    });
  },
}));
