import { z } from 'zod';
import { MAX_QUANTITY } from '@/features/cart/cartMath';
import { NAME_MAX } from '@/features/checkout/validateContact';
import { MAX_COMMENT_LENGTH } from '@/features/reviews/validateReview';
import { MAX_CUSTOM_TIP } from '@/features/tips/tips';
import type { Rating } from '@/types';

/**
 * Request bodies. Objects are parsed non-strictly: unknown keys (e.g. a "price" or "total" a
 * tampered client adds) are DROPPED, never read. Every string has a length limit.
 */
const id = z.string().trim().min(1).max(100);
const rating = z
  .number()
  .int()
  .min(1)
  .max(5)
  .transform((value) => value as Rating);

export const checkoutRequestSchema = z.object({
  customer: z.object({
    // Accounts do not exist yet; the server treats every order as a guest order.
    type: z.literal('guest'),
    name: z.string().max(NAME_MAX * 2),
    phone: z.string().max(40),
    email: z.string().max(254).optional(),
  }),
  items: z
    .array(
      z.object({
        productId: id,
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
        selectedOptions: z
          .array(z.object({ optionId: id, valueId: id }))
          .max(10)
          .optional(),
      }),
    )
    .min(1)
    .max(100),
  promoCode: z.string().max(40).optional(),
  tip: z.number().int().min(0).max(MAX_CUSTOM_TIP),
  locationId: id,
  pickupTime: z.string().max(40),
});

export const placeOrderSchema = z.object({ quoteId: z.string().min(1).max(100) });

export const promoValidateSchema = z.object({
  code: z.string().max(40),
  subtotal: z.number().int().min(0).max(10_000_000),
});

export const reviewSchema = z.object({
  rating,
  foodRating: rating.optional(),
  serviceRating: rating.optional(),
  speedRating: rating.optional(),
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
});
