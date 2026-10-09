import type { Review, ReviewDraft } from '@/types';

export interface ReviewService {
  /** Only allowed for picked-up orders — the backend enforces it. */
  submit(draft: ReviewDraft): Promise<Review>;
  listPublished(): Promise<Review[]>;
  getForOrder(orderId: string): Promise<Review | undefined>;
}
