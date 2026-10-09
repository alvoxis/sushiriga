import { canReview } from '@/features/orders/orderStatus';
import { validateReview } from '@/features/reviews/validateReview';
import type { Review, ReviewDraft } from '@/types';
import type { Store } from '../db/store';
import { newSecretId } from '../security/tokens';

export class ReviewError extends Error {
  constructor(
    readonly code: 'invalid-review' | 'not-picked-up' | 'already-reviewed',
    message: string,
  ) {
    super(message);
    this.name = 'ReviewError';
  }
}

/**
 * Reviews: one per order, only after pickup, always with a customer-chosen 1–5 rating.
 * New reviews wait for moderation and are not public until staff publish them.
 */
export function createReviewService(store: Store, now: () => Date) {
  return {
    /** `orderId` must already be authorised by the caller (order access token). */
    submit(orderId: string, draft: Omit<ReviewDraft, 'orderId' | 'customerId'>): Review {
      const errors = validateReview({ ...draft, orderId });
      if (errors.length) throw new ReviewError('invalid-review', errors.join(', '));
      return store.transaction(() => {
        const order = store.orders.find(orderId);
        if (!order || !canReview(order.status)) {
          throw new ReviewError('not-picked-up', 'Reviews are possible after pickup');
        }
        if (store.reviews.findByOrder(orderId)) {
          throw new ReviewError('already-reviewed', 'This order already has a review');
        }
        const review: Review = {
          id: newSecretId('review'),
          orderId,
          rating: draft.rating,
          ...(draft.foodRating ? { foodRating: draft.foodRating } : {}),
          ...(draft.serviceRating ? { serviceRating: draft.serviceRating } : {}),
          ...(draft.speedRating ? { speedRating: draft.speedRating } : {}),
          ...(draft.comment?.trim() ? { comment: draft.comment.trim() } : {}),
          createdAt: now().toISOString(),
        };
        store.reviews.insert(review);
        return review;
      });
    },
    forOrder(orderId: string): Review | undefined {
      const stored = store.reviews.findByOrder(orderId);
      if (!stored) return undefined;
      const review: Review & { status?: unknown } = { ...stored };
      delete review.status; // moderation state is internal
      return review;
    },
    listPublished: () => store.reviews.listPublished(),
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
