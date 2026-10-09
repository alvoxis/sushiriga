import { checkPickupTime } from '@/features/pickup/pickupSlots';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { OrderError } from '@/services/orders/orderService';
import type { Order } from '@/types';
import type { Store } from '../db/store';
import type { PaymentGateway, PaymentIntentInfo } from '../payments/gateway';
import type { CatalogService } from './catalog';

export class PaymentError extends Error {
  constructor(
    readonly code: 'payments-unavailable' | 'payment-not-needed' | 'order-closed',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/** Provider statuses in which the customer can still complete the same payment. */
const REUSABLE = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
]);

export interface PaymentDeps {
  store: Store;
  catalog: CatalogService;
  gateway: PaymentGateway | null;
  now: () => Date;
}

/**
 * Online payment for an order.
 *
 * - The amount always comes from the stored order (priced by the server), never from a client.
 * - An order becomes PAID only when the provider says the payment SUCCEEDED for exactly the
 *   order total in EUR and for this order: from a signature-verified webhook, or when the server
 *   itself asks the provider (`refresh`). A browser saying "I paid" changes nothing.
 */
export function createPaymentService({ store, catalog, gateway, now }: PaymentDeps) {
  function requireGateway(): PaymentGateway {
    if (!gateway) throw new PaymentError('payments-unavailable', 'Online payment is not set up');
    return gateway;
  }

  /** Applies a provider payment to its order. Safe to call repeatedly (webhook retries). */
  function apply(intent: PaymentIntentInfo): Order | undefined {
    return store.transaction(() => {
      const payment = store.payments.findByIntent(intent.id);
      if (!payment) {
        console.warn(`[payments] ignoring unknown payment ${intent.id}`);
        return undefined;
      }
      store.payments.setStatus(intent.id, intent.status, now());
      const order = store.orders.find(payment.orderId);
      if (!order || intent.status !== 'succeeded') return order;
      if (order.status !== 'PENDING_PAYMENT') {
        if (order.status === 'CANCELLED') {
          // Paid after staff cancelled it: the money must go back. Visible to staff via payments.
          console.error(`[payments] order ${order.id} was paid after cancellation — refund it`);
        }
        return order; // already PAID (or further): nothing to do
      }
      const matches =
        intent.orderId === order.id &&
        intent.currency === 'eur' &&
        intent.amountReceived === order.total;
      if (!matches) {
        console.error(
          `[payments] payment ${intent.id} does not match order ${order.id} ` +
            `(${intent.amountReceived} ${intent.currency} vs ${order.total} eur) — not marked paid`,
        );
        return order;
      }
      const at = now().toISOString();
      const paid: Order = {
        ...order,
        status: 'PAID',
        payment: { provider: 'stripe', reference: intent.id },
        statusHistory: [...order.statusHistory, { status: 'PAID', at }],
        updatedAt: at,
      };
      store.orders.save(paid);
      if (paid.promoCode) store.promo.incrementUsage(paid.promoCode);
      return paid;
    });
  }

  return {
    /** Public payment configuration for the browser (publishable key only). */
    publicConfig() {
      return gateway
        ? { provider: gateway.provider, publishableKey: gateway.publishableKey }
        : null;
    },

    /**
     * Creates (or reuses) the provider payment for an unpaid order and returns what the Payment
     * Element needs. Refused when the pickup time can no longer be met — pay for a new order then.
     */
    async start(orderId: string): Promise<{ clientSecret: string; amount: number }> {
      const provider = requireGateway();
      const order = store.orders.find(orderId);
      if (!order) throw new OrderError('order-not-found', 'Order not found');
      if (order.status === 'CANCELLED') throw new PaymentError('order-closed', 'Order cancelled');
      if (order.status !== 'PENDING_PAYMENT') {
        throw new PaymentError('payment-not-needed', 'This order is already paid');
      }
      const location = catalog.locations().find((l) => l.id === order.location);
      if (
        !location ||
        checkPickupTime(location, now(), STANDARD_PREPARATION_MINUTES, order.pickupTime)
      ) {
        throw new OrderError('pickup-unavailable', 'The pickup time can no longer be met');
      }

      const existing = store.payments.find(orderId);
      if (existing && existing.amount === order.total) {
        const intent = await provider.retrieveIntent(existing.intentId);
        if (intent.status === 'succeeded') {
          apply(intent);
          throw new PaymentError('payment-not-needed', 'This order is already paid');
        }
        if (REUSABLE.has(intent.status) && intent.clientSecret) {
          return { clientSecret: intent.clientSecret, amount: order.total };
        }
      }

      const intent = await provider.createIntent({
        orderId,
        amount: order.total,
        description: `SUSHIRIGA ${orderId}`,
        // Retries of the same attempt never create a second payment at the provider.
        idempotencyKey: `sushiriga:${orderId}:${order.total}:${existing?.intentId ?? 'first'}`,
      });
      if (!intent.clientSecret) throw new PaymentError('payments-unavailable', 'No client secret');
      store.payments.save(
        {
          orderId,
          provider: 'stripe',
          intentId: intent.id,
          amount: order.total,
          status: intent.status,
        },
        now(),
      );
      return { clientSecret: intent.clientSecret, amount: order.total };
    },

    /**
     * Asks the provider directly (server to server) for the state of the order's payment —
     * used after the customer completes the payment, so the page does not wait for the webhook.
     */
    async refresh(orderId: string): Promise<Order> {
      const order = store.orders.find(orderId);
      if (!order) throw new OrderError('order-not-found', 'Order not found');
      const payment = store.payments.find(orderId);
      if (!payment || !gateway || order.status !== 'PENDING_PAYMENT') return order;
      return apply(await gateway.retrieveIntent(payment.intentId)) ?? order;
    },

    /**
     * Stripe webhook: verify the signature, then apply the payment's CURRENT state, fetched from
     * the provider (events can arrive late or out of order). An event is recorded as processed
     * only after it was applied, so a failure makes the provider retry it.
     */
    async handleWebhook(rawBody: string, signature: string | undefined): Promise<void> {
      const provider = requireGateway();
      const event = await provider.verifyWebhook(rawBody, signature);
      if (store.webhookEvents.has(event.id)) return;
      if (event.intent && event.type.startsWith('payment_intent.')) {
        apply(await provider.retrieveIntent(event.intent.id));
      }
      store.webhookEvents.record(event.id, event.type, now());
    },
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;
