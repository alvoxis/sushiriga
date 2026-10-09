import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';
import { createHttpClient } from '@/services/http/httpClient';
import {
  createHttpCatalogService,
  createHttpLocationService,
  createHttpOrderService,
  createHttpPaymentService,
  createHttpPromoService,
  createHttpReviewService,
} from '@/services/http/httpServices';
import { OrderError } from '@/services/orders/orderService';
import type { CheckoutRequest } from '@/types';
import Stripe from 'stripe';
import { createServerContext } from './context';
import { createStripeGateway } from './payments/gateway';
import { fakeIntents, stripeConfig } from './test/fakeStripe';

/**
 * Contract test: the frontend's HTTP services (src/services/http) talking to the real backend
 * app in-process — same requests, same responses, no network and no mocks of either side.
 */
const riga = (time: string) => new Date(`2026-10-05T${time}:00+03:00`); // a Monday

function setup({ payments = false } = {}) {
  let now = riga('12:00');
  const stripe = fakeIntents();
  const gateway = payments
    ? createStripeGateway(stripeConfig, {
        paymentIntents: stripe.api,
        webhooks: new Stripe(stripeConfig.secretKey).webhooks,
      } as unknown as Stripe)
    : null;
  const server = createServerContext(
    {
      production: false,
      host: '127.0.0.1',
      port: 0,
      databasePath: ':memory:',
      orderTokenSecret: 'contract-test-secret-contract-test-secret',
      corsOrigins: [],
      publicDir: null,
      trustProxy: false,
      stripe: payments ? stripeConfig : null,
    },
    () => now,
    gateway,
  );
  // The browser's localStorage (order access tokens live there).
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal('fetch', (input: URL | string, init?: RequestInit) =>
    server.app.request(String(input), init),
  );
  const http = createHttpClient('http://shop.test/');
  return {
    server,
    storage,
    stripe,
    orders: createHttpOrderService(http),
    payments: createHttpPaymentService(http),
    promo: createHttpPromoService(http),
    reviews: createHttpReviewService(http),
    catalog: createHttpCatalogService(http, { categories, products }),
    locations: createHttpLocationService(http, locations),
    setNow: (date: Date) => {
      now = date;
    },
  };
}

const request: CheckoutRequest = {
  customer: { type: 'guest', name: 'Anna', phone: '+371 20 000 000' },
  items: [{ productId: 'maestro', quantity: 2 }],
  tip: 100,
  locationId: 'location-1',
  pickupTime: 'asap',
};

afterEach(() => vi.unstubAllGlobals());

describe('frontend HTTP services ↔ backend', () => {
  it('menu, locations and a server-checked promo code', async () => {
    const app = setup();
    expect((await app.catalog.getCatalog()).products).toHaveLength(99);
    expect((await app.locations.listActive()).map((l) => l.id)).toEqual(['location-1']);
    expect(app.promo.mode).toBe('server');
    expect(await app.promo.validate('nope', { subtotal: 2000 })).toMatchObject({
      valid: false,
      reason: 'not-found',
    });
    app.server.store.promo.upsert(
      {
        code: 'SUSHI5',
        type: 'fixed',
        value: 500,
        usageCount: 0,
        active: true,
        visibility: 'public',
      },
      new Date(),
    );
    expect(await app.promo.validate('sushi5', { subtotal: 2000 })).toEqual({
      valid: true,
      code: 'SUSHI5',
      discount: 500,
    });
  });

  it('a guest order end to end: quote → place → status page → review', async () => {
    const app = setup();
    const quote = await app.orders.quote(request);
    expect(quote.total).toBe(2200);
    const order = await app.orders.placeOrder(quote.quoteId);
    expect(order).toMatchObject({ status: 'PENDING_PAYMENT', payment: null, total: 2200 });

    // The access token was kept by "the browser" and is used to read the order.
    expect(await app.orders.getOrder(order.id)).toEqual(order);
    // Another browser (no token) cannot see it.
    app.storage.clear();
    expect(await app.orders.getOrder(order.id)).toBeUndefined();
    await app.orders.placeOrder(quote.quoteId); // idempotent: returns the token again
    expect(await app.orders.getOrder(order.id)).toEqual(order);

    await expect(app.reviews.submit({ orderId: order.id, rating: 5 })).rejects.toThrow();
    app.server.store.orders.save({ ...order, status: 'PICKED_UP' });
    const review = await app.reviews.submit({ orderId: order.id, rating: 4, comment: 'Labi' });
    expect(review).toMatchObject({ rating: 4, comment: 'Labi' });
    expect(await app.reviews.getForOrder(order.id)).toMatchObject({ rating: 4 });
    expect(await app.reviews.listPublished()).toEqual([]); // not moderated yet
  });

  it('server errors arrive as the OrderError codes the checkout UI handles', async () => {
    const app = setup();
    const slot = { ...request, pickupTime: riga('12:30').toISOString() };
    const quote = await app.orders.quote(slot);
    app.setNow(riga('12:20'));
    await expect(app.orders.placeOrder(quote.quoteId)).rejects.toMatchObject({
      code: 'pickup-unavailable',
    });
    await expect(
      app.orders.quote({ ...request, items: [{ productId: 'nope', quantity: 1 }] }),
    ).rejects.toMatchObject({ code: 'unavailable-product' });
    await expect(app.orders.placeOrder('quote_unknown')).rejects.toMatchObject({
      code: 'quote-not-found',
    });

    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    const offline = app.orders.quote(request);
    await expect(offline).rejects.toBeInstanceOf(OrderError);
    await expect(offline).rejects.toMatchObject({ code: 'network' });
    // The verified menu bundled with the site is still shown while offline.
    expect((await app.catalog.getCatalog()).products).toHaveLength(99);
  });

  it('online payment: availability, a server-priced payment, PAID only after Stripe confirms', async () => {
    const off = setup();
    expect(await off.payments.availability()).toEqual({
      available: false,
      reason: 'not-configured',
    });

    const app = setup({ payments: true });
    expect(await app.payments.availability()).toEqual({
      available: true,
      provider: 'stripe',
      publishableKey: 'pk_test_unit',
    });
    const order = await app.orders.placeOrder((await app.orders.quote(request)).quoteId);
    expect(await app.payments.start(order.id)).toEqual({
      clientSecret: 'pi_1_secret_abc',
      amount: 2200,
    });
    expect((await app.payments.refresh(order.id)).status).toBe('PENDING_PAYMENT');
    app.stripe.succeed('pi_1');
    expect((await app.payments.refresh(order.id)).status).toBe('PAID');
    await expect(app.payments.start(order.id)).rejects.toMatchObject({
      code: 'payment-not-needed',
    });

    // Another browser (no access token) cannot start or check the payment.
    app.storage.clear();
    await expect(app.payments.start(order.id)).rejects.toMatchObject({ code: 'failed' });
  });
});
