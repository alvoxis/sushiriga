import type { Cents } from './money';

export type PromoDiscountType = 'percentage' | 'fixed';
export type PromoVisibility = 'public' | 'personal';

export interface PromoCode {
  code: string;
  type: PromoDiscountType;
  /** percentage: 1–100; fixed: cents. */
  value: number;
  minOrderValue?: Cents;
  /** ISO date-time. */
  expiresAt?: string;
  /** Total redemptions allowed. Undefined = unlimited. */
  usageLimit?: number;
  usageCount: number;
  active: boolean;
  visibility: PromoVisibility;
  /** Required when visibility is "personal". */
  customerId?: string;
}

export type PromoRejectionReason =
  | 'not-found'
  | 'inactive'
  | 'expired'
  | 'usage-limit-reached'
  | 'min-order-not-met'
  | 'not-eligible';

export type PromoValidationResult =
  | { valid: true; code: string; discount: Cents }
  | { valid: false; code: string; reason: PromoRejectionReason; minOrderValue?: Cents };
