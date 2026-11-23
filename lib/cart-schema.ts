import { z } from 'zod';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates product slug format:
 * - Lowercase alphanumeric words separated by single hyphens
 * - Length between 1 and 80 characters
 * - No dependency on static catalogue data
 */
export const productSlugSchema = z
  .string()
  .min(1, 'Product slug is required')
  .max(80, 'Product slug cannot exceed 80 characters')
  .regex(SLUG_REGEX, 'Invalid product slug format: must be lowercase letters, digits, and hyphens (max 80 chars)');

/**
 * Cart item schema validating slug format and quantity between 1 and 10.
 */
export const cartItemSchema = z
  .object({
    slug: productSlugSchema,
    quantity: z
      .number()
      .int({ message: 'Quantity must be an integer' })
      .min(1, { message: 'Quantity must be at least 1' })
      .max(10, { message: 'Quantity cannot exceed 10' }),
  })
  .strict();

/**
 * Cart update payload schema capping at 20 line items.
 */
export const updateCartSchema = z
  .object({
    items: z
      .array(cartItemSchema)
      .max(20, 'Cart cannot contain more than 20 line items'),
  })
  .strict();

/**
 * Factory helper maintaining compatibility with custom validators.
 * If no custom validator is provided, validates slug format only.
 */
export function createCartItemSchema(customValidator?: (slug: string) => boolean) {
  if (!customValidator) {
    return cartItemSchema;
  }
  return z
    .object({
      slug: productSlugSchema.refine(customValidator, {
        message: 'Invalid product slug: not found in catalogue',
      }),
      quantity: z
        .number()
        .int({ message: 'Quantity must be an integer' })
        .min(1, { message: 'Quantity must be at least 1' })
        .max(10, { message: 'Quantity cannot exceed 10' }),
    })
    .strict();
}

/**
 * Factory helper for update cart schema.
 * If no custom validator is provided, validates slug format only.
 */
export function createUpdateCartSchema(customValidator?: (slug: string) => boolean) {
  if (!customValidator) {
    return updateCartSchema;
  }
  return z
    .object({
      items: z
        .array(createCartItemSchema(customValidator))
        .max(20, 'Cart cannot contain more than 20 line items'),
    })
    .strict();
}
