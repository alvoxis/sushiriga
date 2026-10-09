import type {
  AdminOrder,
  AdminProduct,
  AdminReview,
  DaySummary,
  OrderStatus,
  PreparationTimeOption,
  PromoCode,
  ReviewModeration,
  StaffUser,
} from '@/types';

export type AdminErrorCode =
  | 'unauthorized'
  | 'invalid-credentials'
  | 'forbidden'
  | 'invalid-transition'
  | 'invalid-preparation-time'
  | 'invalid-promo'
  | 'refund-unavailable'
  | 'payment-provider-error'
  | 'too-many-requests'
  | 'not-found'
  | 'network'
  | 'failed';

export class AdminError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

/**
 * Restaurant admin panel API (backend only — there is no demo staff). Sign-in uses an HttpOnly
 * session cookie set by the server; the browser never sees the session token.
 */
export interface AdminService {
  me(): Promise<StaffUser | null>;
  login(email: string, password: string): Promise<StaffUser>;
  logout(): Promise<void>;

  orders(status?: OrderStatus[]): Promise<AdminOrder[]>;
  /** PAID → ACCEPTED: staff choose the final preparation time (10…80 minutes). */
  accept(id: string, preparationTime: PreparationTimeOption): Promise<AdminOrder>;
  setStatus(id: string, status: OrderStatus, note?: string): Promise<AdminOrder>;
  setPreparationTime(id: string, minutes: PreparationTimeOption): Promise<AdminOrder>;
  summary(): Promise<DaySummary>;

  menu(): Promise<AdminProduct[]>;
  setProduct(
    productId: string,
    change: { available?: boolean | null; price?: number | null },
  ): Promise<AdminProduct>;

  promoCodes(): Promise<PromoCode[]>;
  savePromoCode(promo: Omit<PromoCode, 'usageCount'>): Promise<PromoCode>;

  reviews(status: ReviewModeration): Promise<AdminReview[]>;
  moderateReview(id: string, status: ReviewModeration): Promise<AdminReview>;
}
