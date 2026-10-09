import Stripe from 'stripe';
import type { StripeConfig } from '../config';

/** What the order logic needs to know about a provider payment. */
export interface PaymentIntentInfo {
  id: string;
  /** Provider status, e.g. requires_payment_method, processing, succeeded, canceled. */
  status: string;
  amount: number;
  amountReceived: number;
  currency: string;
  /** Our order id, from the intent's metadata. */
  orderId: string | undefined;
  clientSecret: string | null;
}

export interface WebhookEvent {
  id: string;
  type: string;
  /** Present for payment_intent.* events. */
  intent?: PaymentIntentInfo;
}

/**
 * Payment provider boundary. The only implementation talks to Stripe with the SECRET key; it
 * exists only when the keys are configured. Tests may pass their own implementation.
 */
export interface PaymentGateway {
  readonly provider: 'stripe';
  readonly publishableKey: string;
  createIntent(input: {
    orderId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
  }): Promise<PaymentIntentInfo>;
  retrieveIntent(id: string): Promise<PaymentIntentInfo>;
  /** Verifies the provider's signature on a raw webhook body. Throws when it is not authentic. */
  verifyWebhook(rawBody: string, signature: string | undefined): Promise<WebhookEvent>;
}

export class PaymentProviderError extends Error {
  override name = 'PaymentProviderError';
}

export class WebhookSignatureError extends Error {
  override name = 'WebhookSignatureError';
}

function toInfo(intent: Stripe.PaymentIntent): PaymentIntentInfo {
  return {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    amountReceived: intent.amount_received,
    currency: intent.currency,
    orderId: intent.metadata?.orderId,
    clientSecret: intent.client_secret,
  };
}

export function createStripeGateway(config: StripeConfig, client?: Stripe): PaymentGateway {
  const stripe =
    client ??
    new Stripe(config.secretKey, {
      maxNetworkRetries: 2,
      timeout: 15_000,
      appInfo: { name: 'sushiriga' },
    });

  const call = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      // Never pass provider error details (they can contain request data) to the client.
      console.error('[stripe] request failed', error instanceof Error ? error.message : error);
      throw new PaymentProviderError('The payment provider did not respond');
    }
  };

  return {
    provider: 'stripe',
    publishableKey: config.publishableKey,

    createIntent: ({ orderId, amount, description, idempotencyKey }) =>
      call(async () =>
        toInfo(
          await stripe.paymentIntents.create(
            {
              amount,
              currency: 'eur',
              description,
              metadata: { orderId },
              automatic_payment_methods: { enabled: true },
            },
            { idempotencyKey },
          ),
        ),
      ),

    retrieveIntent: (id) => call(async () => toInfo(await stripe.paymentIntents.retrieve(id))),

    async verifyWebhook(rawBody, signature) {
      if (!signature) throw new WebhookSignatureError('Missing Stripe-Signature header');
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, config.webhookSecret);
      } catch {
        throw new WebhookSignatureError('Invalid webhook signature');
      }
      const object = event.data.object as { object?: string };
      return {
        id: event.id,
        type: event.type,
        ...(object.object === 'payment_intent'
          ? { intent: toInfo(object as Stripe.PaymentIntent) }
          : {}),
      };
    },
  };
}
