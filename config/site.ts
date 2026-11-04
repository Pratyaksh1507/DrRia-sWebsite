/**
 * Site & E-Commerce Store Configuration
 * Configures guest cart persistence, login cart reconciliation, and brand metadata.
 */

export type GuestCartPersistence = 'session' | 'none';
export type CartOnLogin = 'replace' | 'merge';

/**
 * Guest cart persistence policy:
 * - "session": lives in memory + sessionStorage (survives in-tab refreshes, clears on tab/browser close).
 * - "none": in-memory only (clears on refresh or navigation away).
 * NOTE: localStorage is NEVER used for guest carts.
 */
export const GUEST_CART_PERSISTENCE: GuestCartPersistence = 'session';

/**
 * Cart reconciliation policy when a user logs in:
 * - "replace": clear the guest cart, load that user's saved cart from the server. A new user gets an empty cart.
 * - "merge": combine guest items with the saved cart (add quantities, cap at 10 per product).
 */
export const CART_ON_LOGIN: CartOnLogin = 'replace';

/**
 * Site contact and configuration details
 */
export const SITE_CONFIG = {
  name: "Dr Ria's",
  tagline: 'Skincare & Haircare, Made with Care in India',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://drrias.in',
  customerCarePhone: '+91-9469088317',
  customerCareEmail: 'drrias.official@gmail.com',
  instagramUrl:
    'https://www.instagram.com/drrias.official?psln=aHBzenR1enhmeXZ1&utm_source=qr',
  instagramHandle: '@drrias.official',
  credits: {
    marketing: 'Sachin Kashyap',
    development: 'Pratyaksh Kalsi',
  },
} as const;

