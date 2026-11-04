import { z } from 'zod';

/**
 * Creates the strict cart line item schema using the provided catalogue validator.
 */
export function createCartItemSchema(isValidSlug: (slug: string) => boolean) {
  return z
    .object({
      slug: z.string().refine(isValidSlug, {
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
 * Creates the strict cart payload schema rejecting unknown properties and capping at 20 line items.
 */
export function createUpdateCartSchema(isValidSlug: (slug: string) => boolean) {
  return z
    .object({
      items: z
        .array(createCartItemSchema(isValidSlug))
        .max(20, 'Cart cannot contain more than 20 line items'),
    })
    .strict();
}
