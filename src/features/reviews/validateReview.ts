import type { Rating, ReviewDraft } from '@/types';
import { RATINGS } from '@/types';

export const MAX_COMMENT_LENGTH = 1000;

export function isRating(value: unknown): value is Rating {
  return typeof value === 'number' && (RATINGS as readonly number[]).includes(value);
}

export type ReviewError = 'rating-required' | 'comment-too-long';

/** A review needs an explicit 1–5 overall rating chosen by the customer. No defaults. */
export function validateReview(draft: Partial<ReviewDraft>): ReviewError[] {
  const errors: ReviewError[] = [];
  if (!isRating(draft.rating)) errors.push('rating-required');
  if ((draft.comment?.length ?? 0) > MAX_COMMENT_LENGTH) errors.push('comment-too-long');
  return errors;
}
