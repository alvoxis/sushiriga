/** 1–5 stars. Never defaulted — the customer always picks it. */
export type Rating = 1 | 2 | 3 | 4 | 5;
export const RATINGS: readonly Rating[] = [1, 2, 3, 4, 5];

export interface Review {
  id: string;
  orderId: string;
  customerId?: string;
  rating: Rating;
  comment?: string;
  foodRating?: Rating;
  serviceRating?: Rating;
  speedRating?: Rating;
  createdAt: string;
}

export type ReviewDraft = Omit<Review, 'id' | 'createdAt'>;

/** What the public reviews page shows: no order or customer references. */
export type PublishedReview = Omit<Review, 'orderId' | 'customerId'>;
