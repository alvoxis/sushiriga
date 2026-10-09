import type {
  CheckoutQuote,
  CheckoutRequest,
  Order,
  OrderStatus,
  PreparationTimeOption,
} from '@/types';

export type OrderErrorCode =
  | 'invalid-request'
  | 'invalid-contact'
  | 'pickup-unavailable'
  | 'unavailable-product'
  | 'quote-not-found'
  | 'order-not-found'
  | 'payment-not-confirmed'
  | 'too-many-requests'
  | 'network'
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
 * Trust model (implemented by the backend in server/):
 * 1. `quote()` — the browser sends ids/quantities/promo/tip only; the SERVER prices everything.
 * 2. `placeOrder()` creates the order as PENDING_PAYMENT.
 * 3. The payment is created by the server for the stored order total (PaymentService), and only
 *    the provider's confirmation, checked by the server, moves the order to PAID.
 */
export interface OrderService {
  quote(request: CheckoutRequest): Promise<CheckoutQuote>;
  /**
   * Creates the order for a quote with status PENDING_PAYMENT — no payment is taken or implied.
   * A confirmed payment later moves it to PAID on the server (see PaymentService).
   */
  placeOrder(quoteId: string): Promise<Order>;
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
