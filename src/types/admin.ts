import type { Order } from './order';
import type { Product } from './product';
import type { Review } from './review';

/**
 * Restaurant admin panel types (shared by the backend and the admin UI).
 * - `staff`: works with orders and marks dishes as sold out;
 * - `admin`: additionally prices, promo codes and review moderation.
 */
export type StaffRole = 'admin' | 'staff';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
}

/** An order as staff see it: plus the state of its online payment. */
export interface AdminOrder extends Order {
  /** Provider status of the online payment (e.g. "succeeded", "refunded"); null = none started. */
  paymentStatus: string | null;
}

/** A dish with the staff-managed changes applied, plus what the menu itself says. */
export interface AdminProduct {
  product: Product;
  /** Price from the menu data (sushiriga.lv). */
  basePrice: number;
  /** null = as in the menu. */
  availableOverride: boolean | null;
  priceOverride: number | null;
}

export type ReviewModeration = 'pending' | 'published' | 'rejected';

export interface AdminReview extends Review {
  status: ReviewModeration;
}

export interface DaySummary {
  /** Restaurant-local date, YYYY-MM-DD. */
  date: string;
  /** Orders that were paid (PAID or later, not cancelled). */
  paidOrders: number;
  /** Sum of their totals, cents (including tips). */
  revenue: number;
  /** "Подарить улыбку" — tips in those orders, cents. */
  tips: number;
  cancelled: number;
}
