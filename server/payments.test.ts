import Stripe from 'stripe';
import type { CheckoutQuote, CheckoutRequest, Order } from '@/types';
import type { ServerConfig } from './config';
import { createServerContext } from './context';
import { createStripeGateway } from './payments/gateway';
import { fakeIntents, stripeConfig } from './test/fakeStripe';

/**
 * Payments with the real gateway code and the real Stripe SDK webhook signature check. Only the
 * network calls to Stripe (create/retrieve PaymentIntent) are replaced by an in-memory stand-in.
 */
const riga = (time: string) => new Date(`2026-10-05T${time}:00+03:00`); // a Monday

function setup({ payments = true } = {}) {
  let now = riga('12:00');
  const stripe = new Stripe(stripeConfig.secretKey);
  const fake = fakeIntents();
  const client = { paymentIntents: fake.api, webhooks: stripe.webhooks } as unknown as Stripe;
  const config: ServerConfig = {
    production: false,
    host: '127.0.0.1',
    port: 0,
    databasePath: ':memory:',
    orderTokenSecret: 'payments-test-secret-payments-test-secret',
    corsOrigins: [],
    publicDir: null,
    trustProxy: false,
    stripe: payments ? stripeConfig : null,
  };
  const context = createServerContext(
    config,
    () => now,
    payments ? createStripeGateway(stripeConfig, client) : null,
  );
  const call = (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const { json, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (json !== undefined) headers.set('Content-Type', 'application/json');
    return context.app.request(path, {
      ...rest,
      headers,
      ...(json !== undefined ? { method: 'POST', body: JSON.stringify(json) } : {}),
    });
  };

  async function placeOrder(body: Partial<CheckoutRequest> = {}) {
    const request: CheckoutRequest = {
      customer: { type: 'guest', name: 'Anna', phone: '+371 20 000 000' },
      items: [{ productId: 'maestro', quantity: 2 }],
      tip: 100,
      locationId: 'location-1',
      pickupTime: 'asap',
      ...body,
    };
    const quote = (await (
      await call('/api/checkout/quote', { json: request })
    ).json()) as CheckoutQuote;
    const placed = (await (
      await call('/api/orders', { json: { quoteId: quote.quoteId } })
    ).json()) as {
      order: Order;
      accessToken: string;
    };
    return { ...placed, headers: { 'X-Order-Token': placed.accessToken } };
  }

  async function sendWebhook(type: string, intentId: string, eventId = `evt_${intentId}_${type}`) {
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type,
      data: { object: fake.intents.get(intentId) ?? { id: intentId, object: 'payment_intent' } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: stripeConfig.webhookSecret,
    });
    return call('/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
      body: payload,
    });
  }

  const order = (id: string) => context.store.orders.find(id)!;
  return { ...context, call, fake, placeOrder, sendWebhook, order, setNow: (d: Date) => (now = d) };
}

describe('payment configuration', () => {
  it('tells the browser whether online payment exists — publishable key only', async () => {
    const off = setup({ payments: false });
    expect(await (await off.call('/api/config')).json()).toEqual({ payments: null });
    expect((await off.call('/api/config')).headers.get('Content-Security-Policy')).not.toContain(
      'stripe',
    );

    const on = setup();
    const res = await on.call('/api/config');
    expect(await res.json()).toEqual({
      payments: { provider: 'stripe', publishableKey: 'pk_test_unit' },
    });
    expect(JSON.stringify(await (await on.call('/api/config')).json())).not.toContain('sk_');
    const csp = res.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("script-src 'self' https://js.stripe.com");
    expect(csp).toContain('frame-src https://js.stripe.com');
  });

  it('without keys, starting a payment is refused clearly', async () => {
    const app = setup({ payments: false });
    const { order, headers } = await app.placeOrder();
    const res = await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: 'payments-unavailable' } });
  });
});

describe('starting a payment', () => {
  it('creates a PaymentIntent for the SERVER total, for this order, once', async () => {
    const app = setup();
    const { order, headers } = await app.placeOrder();
    const res = await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: 'pi_1_secret_abc', amount: 2200 });
    expect(app.fake.calls[0]).toMatchObject({
      params: {
        amount: 2200,
        currency: 'eur',
        metadata: { orderId: order.id },
        automatic_payment_methods: { enabled: true },
      },
      idempotencyKey: `sushiriga:${order.id}:2200:first`,
    });

    // Opening the payment again reuses the same intent.
    const again = await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    expect(await again.json()).toEqual({ clientSecret: 'pi_1_secret_abc', amount: 2200 });
    expect(app.fake.calls).toHaveLength(1);
  });

  it('only for the order holder, only while unpaid and while the pickup time can be met', async () => {
    const app = setup();
    const { order, headers } = await app.placeOrder();
    expect((await app.call(`/api/orders/${order.id}/payment`, { method: 'POST' })).status).toBe(
      404,
    );

    app.setNow(riga('21:50')); // ASAP can no longer be ready before 22:00
    const late = await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    expect(late.status).toBe(409);
    expect(await late.json()).toMatchObject({ error: { code: 'pickup-unavailable' } });

    app.setNow(riga('12:00'));
    await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    app.fake.succeed('pi_1');
    const paid = await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    expect(paid.status).toBe(409);
    expect(await paid.json()).toMatchObject({ error: { code: 'payment-not-needed' } });
    expect(app.order(order.id).status).toBe('PAID');
  });
});

describe('confirming a payment', () => {
  it('a signed webhook for a succeeded payment marks the order PAID — once', async () => {
    const app = setup();
    app.store.promo.upsert(
      {
        code: 'SUSHI10',
        type: 'percentage',
        value: 10,
        usageCount: 0,
        active: true,
        visibility: 'public',
      },
      riga('09:00'),
    );
    const { order, headers } = await app.placeOrder({ promoCode: 'SUSHI10' });
    await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });

    // Still unpaid before Stripe confirms.
    expect((await app.sendWebhook('payment_intent.processing', 'pi_1')).status).toBe(200);
    expect(app.order(order.id).status).toBe('PENDING_PAYMENT');

    app.fake.succeed('pi_1');
    expect((await app.sendWebhook('payment_intent.succeeded', 'pi_1')).status).toBe(200);
    expect(app.order(order.id)).toMatchObject({
      status: 'PAID',
      payment: { provider: 'stripe', reference: 'pi_1' },
    });
    expect(app.order(order.id).statusHistory.map((s) => s.status)).toEqual([
      'PENDING_PAYMENT',
      'PAID',
    ]);
    expect(app.store.promo.find('SUSHI10')?.usageCount).toBe(1);

    // Stripe retries deliveries: the same event (or another success event) changes nothing.
    await app.sendWebhook('payment_intent.succeeded', 'pi_1');
    await app.sendWebhook('payment_intent.succeeded', 'pi_1', 'evt_other');
    expect(app.store.promo.find('SUSHI10')?.usageCount).toBe(1);
    expect(app.order(order.id).statusHistory).toHaveLength(2);
  });

  it('rejects webhooks without a valid signature', async () => {
    const app = setup();
    const { order, headers } = await app.placeOrder();
    await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    app.fake.succeed('pi_1');
    const forged = await app.call('/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Stripe-Signature': 't=1,v1=deadbeef' },
      body: JSON.stringify({
        id: 'evt_x',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1' } },
      }),
    });
    expect(forged.status).toBe(400);
    expect(await forged.json()).toMatchObject({ error: { code: 'invalid-signature' } });
    const unsigned = await app.call('/api/stripe/webhook', { method: 'POST', body: '{}' });
    expect(unsigned.status).toBe(400);
    expect(app.order(order.id).status).toBe('PENDING_PAYMENT');
  });

  it('never marks PAID when the amount received differs from the order total', async () => {
    const app = setup();
    const { order, headers } = await app.placeOrder();
    await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    app.fake.succeed('pi_1', 100);
    await app.sendWebhook('payment_intent.succeeded', 'pi_1');
    expect(app.order(order.id).status).toBe('PENDING_PAYMENT');
  });

  it('refresh asks Stripe itself — a browser cannot claim a payment', async () => {
    const app = setup();
    const { order, headers } = await app.placeOrder();
    await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    const refresh = () =>
      app.call(`/api/orders/${order.id}/payment/refresh`, { method: 'POST', headers });

    expect(await (await refresh()).json()).toMatchObject({ status: 'PENDING_PAYMENT' });
    app.fake.succeed('pi_1');
    expect(await (await refresh()).json()).toMatchObject({ status: 'PAID' });
    expect(
      (await app.call(`/api/orders/${order.id}/payment/refresh`, { method: 'POST' })).status,
    ).toBe(404);
  });

  it('a payment arriving after the order was cancelled does not revive it', async () => {
    const app = setup();
    const { order, headers } = await app.placeOrder();
    await app.call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    app.store.orders.save({ ...app.order(order.id), status: 'CANCELLED' });
    app.fake.succeed('pi_1');
    await app.sendWebhook('payment_intent.succeeded', 'pi_1');
    expect(app.order(order.id).status).toBe('CANCELLED');
    expect(app.store.payments.find(order.id)?.status).toBe('succeeded'); // visible for a refund
  });

  it('ignores events for payments it does not know', async () => {
    const app = setup();
    app.fake.intents.set('pi_foreign', {
      id: 'pi_foreign',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 100,
      amount_received: 100,
      currency: 'eur',
      metadata: {},
      client_secret: null,
    });
    expect((await app.sendWebhook('payment_intent.succeeded', 'pi_foreign')).status).toBe(200);
  });
});
