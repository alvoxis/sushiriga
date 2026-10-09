import type Stripe from 'stripe';
import type { StripeConfig } from '../config';

/** Test-only: Stripe keys that never reach Stripe (the network part is faked below). */
export const stripeConfig: StripeConfig = {
  secretKey: 'sk_test_unit',
  publishableKey: 'pk_test_unit',
  webhookSecret: 'whsec_unit_test_secret',
};

export type Intent = Pick<
  Stripe.PaymentIntent,
  | 'id'
  | 'object'
  | 'status'
  | 'amount'
  | 'amount_received'
  | 'currency'
  | 'metadata'
  | 'client_secret'
>;

/** In-memory PaymentIntents API (what Stripe's servers would do). */
export function fakeIntents() {
  const intents = new Map<string, Intent>();
  const byKey = new Map<string, string>();
  const calls: { params: Stripe.PaymentIntentCreateParams; idempotencyKey?: string }[] = [];
  return {
    intents,
    calls,
    api: {
      async create(params: Stripe.PaymentIntentCreateParams, options?: Stripe.RequestOptions) {
        calls.push({
          params,
          ...(options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
        });
        const known = options?.idempotencyKey && byKey.get(options.idempotencyKey);
        if (known) return intents.get(known)!;
        const id = `pi_${intents.size + 1}`;
        const intent: Intent = {
          id,
          object: 'payment_intent',
          status: 'requires_payment_method',
          amount: params.amount,
          amount_received: 0,
          currency: params.currency,
          metadata: params.metadata as Stripe.Metadata,
          client_secret: `${id}_secret_abc`,
        };
        intents.set(id, intent);
        if (options?.idempotencyKey) byKey.set(options.idempotencyKey, id);
        return intent;
      },
      async retrieve(id: string) {
        const intent = intents.get(id);
        if (!intent) throw new Error('No such payment_intent');
        return intent;
      },
    },
    /** The customer pays in the browser; Stripe marks the intent as succeeded. */
    succeed(id: string, amountReceived?: number) {
      const intent = intents.get(id)!;
      intent.status = 'succeeded';
      intent.amount_received = amountReceived ?? intent.amount;
    },
  };
}
