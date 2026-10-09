import { checkCheckoutDetails, priceCheckout } from '@/features/checkout/priceCheckout';
import { normalizeContact } from '@/features/checkout/validateContact';
import { checkPickupTime } from '@/features/pickup/pickupSlots';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { OrderError } from '@/services/orders/orderService';
import type { CheckoutQuote, CheckoutRequest, Order } from '@/types';
import type { Store } from '../db/store';
import { newOrderId, newSecretId, type OrderTokens } from '../security/tokens';
import type { CatalogService } from './catalog';

/** How long a priced quote can be confirmed. After that the customer is asked to review again. */
export const QUOTE_TTL_MS = 30 * 60_000;

export interface OrderDeps {
  store: Store;
  catalog: CatalogService;
  tokens: OrderTokens;
  now: () => Date;
}

/**
 * The customer-facing order logic of the backend — the source of truth for prices and totals.
 * The browser only ever sends ids, quantities, a promo code, a tip, a location and a time.
 */
export function createOrderService({ store, catalog, tokens, now }: OrderDeps) {
  return {
    quote(input: CheckoutRequest): CheckoutQuote {
      const at = now();
      // Accounts do not exist yet: every order is a guest order, whatever the client claims.
      const request: CheckoutRequest = {
        ...input,
        customer: { type: 'guest', ...normalizeContact(input.customer) },
      };
      const { products } = catalog.catalog();
      const priced = priceCheckout(request, {
        products,
        locations: catalog.activeLocations(),
        findPromo: (code) => store.promo.find(code),
        now: at,
      });
      const location = catalog.activeLocations().find((l) => l.id === request.locationId)!;
      const details = checkCheckoutDetails(request, location, at);
      if (!details.contact) throw new OrderError('invalid-contact', 'Invalid contact details');
      if (details.pickup) {
        throw new OrderError('pickup-unavailable', `Pickup time ${details.pickup}`);
      }
      const quote: CheckoutQuote = { quoteId: newSecretId('quote'), ...priced };
      store.quotes.save(quote, request, at, QUOTE_TTL_MS);
      return quote;
    },

    /**
     * Creates the order for a quote as PENDING_PAYMENT. Idempotent: the same quote always yields
     * the same order (and the same access token), so a retried request never duplicates it.
     */
    place(quoteId: string): { order: Order; token: string } {
      return store.transaction(() => {
        const existing = store.orders.findByQuote(quoteId);
        if (existing) return { order: existing, token: tokens.issue(existing.id) };

        const at = now();
        const entry = store.quotes.find(quoteId, at);
        if (!entry || entry.expired) {
          throw new OrderError('quote-not-found', 'Quote not found or expired');
        }
        const { quote, request } = entry;
        const location = catalog.activeLocations().find((l) => l.id === request.locationId);
        if (
          !location ||
          checkPickupTime(location, at, STANDARD_PREPARATION_MINUTES, request.pickupTime)
        ) {
          throw new OrderError('pickup-unavailable', 'The pickup time is no longer available');
        }

        const iso = at.toISOString();
        const order: Order = {
          id: newOrderId(),
          customer: request.customer,
          items: quote.items,
          subtotal: quote.subtotal,
          discount: quote.discount,
          tip: quote.tip,
          total: quote.total,
          ...(quote.promoCode ? { promoCode: quote.promoCode } : {}),
          location: request.locationId,
          pickupTime: request.pickupTime,
          preparationTime: null, // chosen by staff when they accept the paid order
          status: 'PENDING_PAYMENT',
          statusHistory: [{ status: 'PENDING_PAYMENT', at: iso }],
          payment: null,
          createdAt: iso,
          updatedAt: iso,
        };
        store.orders.insert(order, quoteId);
        return { order, token: tokens.issue(order.id) };
      });
    },

    /** The order, only for the holder of its access token. */
    get(id: string, token: string | undefined): Order {
      const order = store.orders.find(id);
      // Same answer for "unknown" and "wrong token": order ids cannot be probed.
      if (!order || !tokens.verify(id, token)) {
        throw new OrderError('order-not-found', 'Order not found');
      }
      return order;
    },

    cleanup(): void {
      store.quotes.deleteExpired(now());
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
