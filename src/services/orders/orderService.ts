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
 * 3. The order exists only after the payment is confirmed. In production the payment webhook
 *    creates it; `awaitPaidOrder()` then just fetches it — the `payment` argument is a hint and
 *    is never trusted by a real backend.
 */
export interface OrderService {
  quote(request: CheckoutRequest): Promise<CheckoutQuote>;
  awaitPaidOrder(quoteId: string, payment: PaymentResult): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  listCustomerOrders(customerId: string): Promise<Order[]>;
}

/** Staff / admin API (future admin panel). Kept separate so checkout never depends on it. */
export interface OrderAdminService {
  listOrders(filter?: { locationId?: string; status?: OrderStatus[] }): Promise<Order[]>;
  /** PAID → ACCEPTED. Staff MUST choose the final preparation time (10…80 min) here. */
  acceptOrder(id: string, preparationTime: PreparationTimeOption): Promise<Order>;
  /** Any other allowed transition (PREPARING, DELAYED, READY, …). Not for ACCEPTED. */
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>;
  /** Change the time later, e.g. together with a delay. */
  setPreparationTime(id: string, minutes: PreparationTimeOption): Promise<Order>;
}
