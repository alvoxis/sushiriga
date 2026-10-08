import type { Review, ReviewDraft } from '@/types';
import { createId } from '@/utils/id';
import { readStorage, writeStorage } from '@/utils/storage';
import { mockDelay } from '../delay';

export interface ReviewService {
  /** Only allowed for picked-up orders — the backend enforces it. */
  submit(draft: ReviewDraft): Promise<Review>;
  listPublished(): Promise<Review[]>;
  getForOrder(orderId: string): Promise<Review | undefined>;
}

const KEY = 'mock.reviews.v1';

/**
 * DEMO: reviews are stored only in this browser and are NOT published — published reviews will
 * come from the backend after moderation. `listPublished` therefore returns nothing in demo mode.
 */
export function createMockReviewService(): ReviewService {
  return {
    async submit(draft) {
      await mockDelay();
      const review: Review = {
        ...draft,
        id: createId('review'),
        createdAt: new Date().toISOString(),
      };
      writeStorage(KEY, [review, ...readStorage<Review[]>(KEY, [])]);
      return review;
    },
    listPublished: async () => [],
    getForOrder: async (orderId) =>
      readStorage<Review[]>(KEY, []).find((r) => r.orderId === orderId),
  };
}
