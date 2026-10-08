import type { Cents } from '@/types';

export type PaymentStatus = 'succeeded' | 'requires_action' | 'failed';

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  provider: 'demo' | 'stripe';
}

/**
 * Payment provider abstraction. The real flow: backend creates a Stripe PaymentIntent with the
 * SECRET key and returns a client secret; the browser confirms it with the PUBLISHABLE key.
 */
export interface PaymentService {
  readonly provider: PaymentResult['provider'];
  pay(input: { amount: Cents; description: string }): Promise<PaymentResult>;
}
