import type { PublishedReview, Review, ReviewDraft } from '@/types';

export interface ReviewService {
  /** Only allowed for picked-up orders — the backend enforces it. */
  submit(draft: ReviewDraft): Promise<Review>;
  /** Moderated reviews only — never order or customer references. */
  listPublished(): Promise<PublishedReview[]>;
  getForOrder(orderId: string): Promise<Review | undefined>;
}
