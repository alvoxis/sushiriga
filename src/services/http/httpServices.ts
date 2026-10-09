import type { Catalog } from '@/features/menu/catalog';
import type {
  CheckoutQuote,
  Location,
  Order,
  PromoValidationResult,
  PublishedReview,
  Review,
} from '@/types';
import type { CatalogService } from '../catalog/catalogService';
import type { LocationService } from '../locations/locationService';
import { OrderError, type OrderErrorCode, type OrderService } from '../orders/orderService';
import {
  PaymentError,
  type PaymentAvailability,
  type PaymentErrorCode,
  type PaymentService,
  type PaymentSession,
} from '../payments/paymentService';
import type { PromoService } from '../promo/promoService';
import type { ReviewService } from '../reviews/reviewService';
import { ApiError, NetworkError, type HttpClient } from './httpClient';
import { orderTokens } from './orderTokens';

/** Must match ORDER_TOKEN_HEADER in server/app.ts. */
const ORDER_TOKEN_HEADER = 'X-Order-Token';

const ORDER_ERROR_CODES: readonly OrderErrorCode[] = [
  'invalid-request',
  'invalid-contact',
  'pickup-unavailable',
  'unavailable-product',
  'quote-not-found',
  'order-not-found',
  'payment-not-confirmed',
  'too-many-requests',
];

/** Turns transport errors into the OrderError codes the UI already understands. */
function toOrderError(error: unknown): unknown {
  if (error instanceof NetworkError) return new OrderError('network', error.message);
  if (error instanceof ApiError) {
    const code = ORDER_ERROR_CODES.find((c) => c === error.code);
    return new OrderError(code ?? 'invalid-request', error.message);
  }
  return error;
}

async function orderCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toOrderError(error);
  }
}

const withToken = (orderId: string): RequestInit => {
  const token = orderTokens.get(orderId);
  return token ? { headers: { [ORDER_TOKEN_HEADER]: token } } : {};
};

export function createHttpOrderService(http: HttpClient): OrderService {
  async function getOrder(id: string): Promise<Order | undefined> {
    if (!orderTokens.get(id)) return undefined; // not this browser's order
    try {
      return await http.get<Order>(`api/orders/${encodeURIComponent(id)}`, withToken(id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined;
      throw toOrderError(error);
    }
  }

  return {
    quote: (request) => orderCall(() => http.post<CheckoutQuote>('api/checkout/quote', request)),

    placeOrder: (quoteId) =>
      orderCall(async () => {
        const { order, accessToken } = await http.post<{ order: Order; accessToken: string }>(
          'api/orders',
          { quoteId },
        );
        orderTokens.set(order.id, accessToken);
        return order;
      }),

    getOrder,

    async listCustomerOrders() {
      throw new OrderError('not-connected', 'Customer accounts do not exist yet');
    },
  };
}

export function createHttpPromoService(http: HttpClient): PromoService {
  return {
    mode: 'server',
    // Only an instant preview: the server re-checks the code when it prices the order.
    validate: (code, ctx) =>
      http.post<PromoValidationResult>('api/promo/validate', { code, subtotal: ctx.subtotal }),
  };
}

export function createHttpReviewService(http: HttpClient): ReviewService {
  return {
    async submit(draft) {
      // The order is identified by its access token; a customer id would come from a session.
      const { orderId, rating, foodRating, serviceRating, speedRating, comment } = draft;
      return http.post<Review>(
        `api/orders/${encodeURIComponent(orderId)}/review`,
        { rating, foodRating, serviceRating, speedRating, comment },
        withToken(orderId),
      );
    },
    listPublished: () => http.get<PublishedReview[]>('api/reviews'),
    async getForOrder(orderId) {
      if (!orderTokens.get(orderId)) return undefined;
      const { review } = await http.get<{ review: Review | null }>(
        `api/orders/${encodeURIComponent(orderId)}/review`,
        withToken(orderId),
      );
      return review ?? undefined;
    },
  };
}

/**
 * The menu from the backend (with staff changes such as "sold out"). If the backend cannot be
 * reached, the menu bundled with the site is shown — it is the same verified menu, and every
 * order is priced by the server anyway, so nothing can be bought at a stale price.
 */
export function createHttpCatalogService(http: HttpClient, bundled: Catalog): CatalogService {
  return {
    async getCatalog() {
      try {
        return await http.get<Catalog>('api/catalog');
      } catch (error) {
        console.warn('[catalog] backend unreachable, showing the bundled menu', error);
        return bundled;
      }
    },
  };
}

export function createHttpLocationService(http: HttpClient, bundled: Location[]): LocationService {
  let cache: Promise<Location[]> | null = null;
  const load = () =>
    (cache ??= http.get<Location[]>('api/locations').catch((error: unknown) => {
      console.warn('[locations] backend unreachable, using bundled locations', error);
      cache = null;
      return bundled.filter((l) => l.active);
    }));
  return {
    listActive: load,
    get: async (id) => (await load()).find((l) => l.id === id),
  };
}

const PAYMENT_ERROR_CODES: readonly PaymentErrorCode[] = [
  'payments-unavailable',
  'payment-not-needed',
  'order-closed',
  'pickup-unavailable',
];

function toPaymentError(error: unknown): PaymentError {
  if (error instanceof NetworkError) return new PaymentError('network', error.message);
  if (error instanceof ApiError) {
    const code = PAYMENT_ERROR_CODES.find((c) => c === error.code);
    return new PaymentError(code ?? 'failed', error.message);
  }
  return new PaymentError('failed', error instanceof Error ? error.message : 'Payment failed');
}

/** Stripe payments through the backend: it holds the secret key and decides what is paid. */
export function createHttpPaymentService(http: HttpClient): PaymentService {
  let config: Promise<PaymentAvailability> | null = null;
  const call = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      throw toPaymentError(error);
    }
  };
  return {
    provider: 'stripe',
    availability: () =>
      (config ??= http
        .get<{ payments: { provider: 'stripe'; publishableKey: string } | null }>('api/config')
        .then(
          ({ payments }): PaymentAvailability =>
            payments
              ? { available: true, provider: 'stripe', publishableKey: payments.publishableKey }
              : { available: false, reason: 'not-configured' },
          (): PaymentAvailability => {
            config = null; // try again next time
            return { available: false, reason: 'unreachable' };
          },
        )),
    start: (orderId) =>
      call(() =>
        http.post<PaymentSession>(
          `api/orders/${encodeURIComponent(orderId)}/payment`,
          undefined,
          withToken(orderId),
        ),
      ),
    refresh: (orderId) =>
      call(() =>
        http.post<Order>(
          `api/orders/${encodeURIComponent(orderId)}/payment/refresh`,
          undefined,
          withToken(orderId),
        ),
      ),
  };
}
