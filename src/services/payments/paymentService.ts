import type { Cents, Order } from '@/types';

export type PaymentStatus = 'succeeded' | 'requires_action' | 'failed';

/** A payment as reported by a provider. Only the demo backend's tests construct these. */
export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  /** `demo` = simulated, no money moved. Never treat a demo result as a real payment. */
  provider: 'demo' | 'stripe';
  quoteId: string;
  amount: Cents;
}

export type PaymentAvailability =
  | { available: true; provider: 'stripe'; publishableKey: string }
  | { available: false; reason: 'demo' | 'not-configured' | 'unreachable' };

/** What the Stripe Payment Element needs for one order. */
export interface PaymentSession {
  clientSecret: string;
  /** The server's order total — the only amount ever charged. */
  amount: Cents;
}

export type PaymentErrorCode =
  | 'payments-unavailable'
  | 'payment-not-needed'
  | 'order-closed'
  | 'pickup-unavailable'
  | 'network'
  | 'failed';

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Online payment (Stripe).
 * 1. `start(orderId)`: the SERVER creates a PaymentIntent for the stored order total with the
 *    secret key and returns its client secret.
 * 2. The browser confirms it in Stripe's Payment Element with the PUBLISHABLE key — card data
 *    goes to Stripe only.
 * 3. The order becomes PAID only on the server: from Stripe's signed webhook, or when the server
 *    asks Stripe itself (`refresh`). Nothing the browser says can mark an order as paid.
 */
export interface PaymentService {
  readonly provider: 'demo' | 'stripe';
  availability(): Promise<PaymentAvailability>;
  start(orderId: string): Promise<PaymentSession>;
  refresh(orderId: string): Promise<Order>;
}
