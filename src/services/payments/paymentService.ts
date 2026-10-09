import type { Cents } from '@/types';

export type PaymentStatus = 'succeeded' | 'requires_action' | 'failed';

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  /** `demo` = simulated, no money moved. Never treat a demo result as a real payment. */
  provider: 'demo' | 'stripe';
  quoteId: string;
  amount: Cents;
}

/**
 * Payment provider abstraction.
 * Real flow (Stripe): backend creates a PaymentIntent for the QUOTE with its own amount and the
 * SECRET key, returns a client secret; the browser confirms it with the PUBLISHABLE key; the
 * webhook marks the order PAID. `amount` here is for display/consistency checks only.
 */
export interface PaymentService {
  readonly provider: PaymentResult['provider'];
  pay(input: { quoteId: string; amount: Cents; description: string }): Promise<PaymentResult>;
}
