export * from '@/config/site';

/**
 * Store Configuration & Feature Flags
 * Promotional items are guarded behind TODO flags and hidden until confirmed.
 */
export const STORE_CONFIG = {
  // TODO: confirm free shipping policy
  ENABLE_FREE_SHIPPING_PROMO: false,
  // TODO: confirm pan-India delivery messaging
  ENABLE_PAN_INDIA_DELIVERY_PROMO: false,
  // TODO: confirm member discounts program
  ENABLE_MEMBER_DISCOUNTS: false,

  // Support contacts
  CUSTOMER_CARE_PHONE: '+91-9469088317',
  CUSTOMER_CARE_EMAIL: 'simplyria11@gmail.com',
} as const;
