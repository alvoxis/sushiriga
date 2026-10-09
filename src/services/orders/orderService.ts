import type {
  CheckoutQuote,
  CheckoutRequest,
  Order,
  OrderStatus,
  PreparationTimeOption,
} from '@/types';
import type { PaymentResult } from '../payments/paymentService';

export type OrderErrorCode =
  | 'invalid-request'
  | 'unavailable-product'
  | 'quote-not-found'
  | 'payment-not-confirmed'
  | 'not-connected';

export class OrderError extends Error {
  constructor(
    readonly code: OrderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

/**
 * Customer-facing order API.
 *
 * Trust model (mirrors the future backend):
 * 1. `quote()` — the browser sends ids/quantities/promo/tip only; the SERVER prices everything.
 * 2. The payment is created for the quote (server-side amount), never for a browser amount.
 * 3. `placeOrder()` creates the order as PENDING_PAYMENT (what checkout does today, as payments
 *    are not connected). Only a confirmed payment moves it to PAID — in production the payment
 *    webhook does that; `awaitPaidOrder()` then just fetches it (the `payment` argument is a hint
 *    and is never trusted by a real backend).
 */
export interface OrderService {
  quote(request: CheckoutRequest): Promise<CheckoutQuote>;
  /**
   * Creates the order for a quote with status PENDING_PAYMENT — no payment is taken or implied.
   * Payment later moves it to PAID (webhook), see `awaitPaidOrder`.
   */
  placeOrder(quoteId: string): Promise<Order>;
  awaitPaidOrder(quoteId: string, payment: PaymentResult): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  listCustomerOrders(customerId: string): Promise<Order[]>;
}

/** Staff / admin API (future admin panel). Kept separate so checkout never depends on it. */
export interface OrderAdminService {
  listOrders(filter?: { locationId?: string; status?: OrderStatus[] }): Promise<Order[]>;
  /** PAID → ACCEPTED. Staff MUST choose the final preparation time (10…80 min) here. */
  acceptOrder(id: string, preparationTime: PreparationTimeOption): Promise<Order>;
  /**
   * Any other allowed transition (PREPARING, DELAYED, READY, …). Never ACCEPTED (use acceptOrder)
   * and never PAID — only a confirmed payment marks an order as paid.
   */
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>;
  /** Change the time later, e.g. together with a delay. */
  setPreparationTime(id: string, minutes: PreparationTimeOption): Promise<Order>;
}
