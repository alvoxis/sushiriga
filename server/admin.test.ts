import Stripe from 'stripe';
import type { AdminOrder, CheckoutQuote, CheckoutRequest, Order } from '@/types';
import type { ServerConfig } from './config';
import { createServerContext } from './context';
import { createStripeGateway } from './payments/gateway';
import { fakeIntents, fakeStripeClient, stripeConfig } from './test/fakeStripe';

const riga = (time: string) => new Date(`2026-10-05T${time}:00+03:00`); // a Monday
const PASSWORD = 'correct horse battery staple';

async function setup() {
  let now = riga('12:00');
  const fake = fakeIntents();
  const config: ServerConfig = {
    production: false,
    host: '127.0.0.1',
    port: 0,
    databasePath: ':memory:',
    orderTokenSecret: 'admin-test-secret-admin-test-secret-admin',
    corsOrigins: [],
    publicDir: null,
    trustProxy: false,
    stripe: stripeConfig,
  };
  const gateway = createStripeGateway(
    stripeConfig,
    fakeStripeClient(fake, new Stripe(stripeConfig.secretKey).webhooks),
  );
  const context = createServerContext(config, () => now, gateway);
  await context.staff.createUser({
    email: 'boss@sushiriga.lv',
    name: 'Boss',
    role: 'admin',
    password: PASSWORD,
  });
  await context.staff.createUser({
    email: 'cook@sushiriga.lv',
    name: 'Cook',
    role: 'staff',
    password: PASSWORD,
  });

  const call = (path: string, init: RequestInit & { json?: unknown; cookie?: string } = {}) => {
    const { json, cookie, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (json !== undefined) {
      headers.set('Content-Type', 'application/json');
      if (!headers.has('X-SushiRiga-Admin')) headers.set('X-SushiRiga-Admin', '1');
    }
    if (cookie) headers.set('Cookie', cookie);
    return context.app.request(path, {
      ...rest,
      headers,
      ...(json !== undefined ? { method: rest.method ?? 'POST', body: JSON.stringify(json) } : {}),
    });
  };

  async function login(email: string, password = PASSWORD) {
    const res = await call('/api/admin/login', { json: { email, password } });
    const cookie = res.headers.get('Set-Cookie')?.split(';')[0] ?? '';
    return { res, cookie };
  }

  async function placeOrder(body: Partial<CheckoutRequest> = {}) {
    const request: CheckoutRequest = {
      customer: { type: 'guest', name: 'Anna', phone: '+371 20 000 000' },
      items: [{ productId: 'maestro', quantity: 2 }],
      tip: 300,
      locationId: 'location-1',
      pickupTime: 'asap',
      ...body,
    };
    const quote = (await (
      await call('/api/checkout/quote', { json: request })
    ).json()) as CheckoutQuote;
    return (await (await call('/api/orders', { json: { quoteId: quote.quoteId } })).json()) as {
      order: Order;
      accessToken: string;
    };
  }

  /** A customer order paid through the (stand-in) Stripe API — status PAID set by the server. */
  async function paidOrder() {
    const { order, accessToken } = await placeOrder();
    const headers = { 'X-Order-Token': accessToken };
    await call(`/api/orders/${order.id}/payment`, { method: 'POST', headers });
    fake.succeed([...fake.intents.keys()].at(-1)!);
    const paid = (await (
      await call(`/api/orders/${order.id}/payment/refresh`, { method: 'POST', headers })
    ).json()) as Order;
    return { order: paid, headers };
  }

  return { ...context, call, login, placeOrder, paidOrder, fake, setNow: (d: Date) => (now = d) };
}

describe('staff sign-in', () => {
  it('protects the admin API with an HttpOnly, SameSite=Strict session cookie', async () => {
    const app = await setup();
    expect((await app.call('/api/admin/orders')).status).toBe(401);

    const wrong = await app.login('boss@sushiriga.lv', 'nope-nope-nope');
    const unknown = await app.login('nobody@sushiriga.lv');
    expect(wrong.res.status).toBe(401);
    expect(await unknown.res.json()).toEqual(await wrong.res.json()); // no account probing

    const { res, cookie } = await app.login(' BOSS@sushiriga.lv ');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      email: 'boss@sushiriga.lv',
      name: 'Boss',
      role: 'admin',
    });
    const setCookie = res.headers.get('Set-Cookie')!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Path=\/api\/admin/);
    expect(await (await app.call('/api/admin/me', { cookie })).json()).toMatchObject({
      role: 'admin',
    });

    // Only a hash of the token is stored.
    const raw = cookie.split('=')[1]!;
    expect(JSON.stringify(app.db.prepare('SELECT * FROM staff_sessions').all())).not.toContain(raw);

    await app.call('/api/admin/logout', {
      method: 'POST',
      cookie,
      headers: { 'X-SushiRiga-Admin': '1' },
    });
    expect(await (await app.call('/api/admin/me', { cookie })).json()).toBeNull();
  });

  it('state changes need the admin header (CSRF), sessions expire, disabled staff are out', async () => {
    const app = await setup();
    const { cookie } = await app.login('cook@sushiriga.lv');
    const noHeader = await app.call('/api/admin/menu/maestro', {
      method: 'POST',
      cookie,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: false }),
    });
    expect(noHeader.status).toBe(403);

    app.setNow(riga('23:59'));
    expect(await (await app.call('/api/admin/me', { cookie })).json()).toMatchObject({
      role: 'staff',
    });
    app.setNow(new Date(riga('12:00').getTime() + 12 * 3600_000 + 1));
    expect(await (await app.call('/api/admin/me', { cookie })).json()).toBeNull();

    app.setNow(riga('12:00'));
    const again = await app.login('cook@sushiriga.lv');
    app.staff.setDisabled('cook@sushiriga.lv', true);
    expect(await (await app.call('/api/admin/me', { cookie: again.cookie })).json()).toBeNull();
    expect((await app.call('/api/admin/orders', { cookie: again.cookie })).status).toBe(401);
    expect((await app.login('cook@sushiriga.lv')).res.status).toBe(401);
  });

  it('limits login attempts', async () => {
    const app = await setup();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++)
      statuses.push((await app.login('boss@sushiriga.lv', 'wrong-password-x')).res.status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('orders board', () => {
  it('staff accept a PAID order with the final time and move it to pickup; the customer sees it', async () => {
    const app = await setup();
    const { cookie } = await app.login('cook@sushiriga.lv');
    const unpaid = (await app.placeOrder()).order;
    const { order, headers } = await app.paidOrder();
    expect(order.status).toBe('PAID');

    const board = (await (await app.call('/api/admin/orders', { cookie })).json()) as AdminOrder[];
    expect(board.map((o) => [o.id, o.status, o.paymentStatus])).toEqual(
      expect.arrayContaining([
        [order.id, 'PAID', 'succeeded'],
        [unpaid.id, 'PENDING_PAYMENT', null],
      ]),
    );
    const paidOnly = (await (
      await app.call('/api/admin/orders?status=PAID', { cookie })
    ).json()) as AdminOrder[];
    expect(paidOnly.map((o) => o.id)).toEqual([order.id]);

    const act = (path: string, json: unknown) =>
      app.call(`/api/admin/orders/${order.id}/${path}`, { json, cookie });
    expect(
      (
        await app.call(`/api/admin/orders/${unpaid.id}/accept`, {
          json: { preparationTime: 30 },
          cookie,
        })
      ).status,
    ).toBe(409);
    expect((await act('accept', { preparationTime: 33 })).status).toBe(400);
    expect((await act('status', { status: 'PAID' })).status).toBe(409);
    expect((await act('status', { status: 'ACCEPTED' })).status).toBe(409);
    expect(await (await act('accept', { preparationTime: 45 })).json()).toMatchObject({
      status: 'ACCEPTED',
      preparationTime: 45,
    });
    expect((await act('status', { status: 'PREPARING' })).status).toBe(200);
    expect(
      await (await act('status', { status: 'DELAYED', note: 'Daudz pasūtījumu' })).json(),
    ).toMatchObject({
      status: 'DELAYED',
    });
    expect(await (await act('preparation-time', { minutes: 60 })).json()).toMatchObject({
      preparationTime: 60,
    });
    expect((await act('status', { status: 'READY' })).status).toBe(200);
    expect((await act('status', { status: 'PREPARING' })).status).toBe(409); // not allowed back
    expect((await act('status', { status: 'PICKED_UP' })).status).toBe(200);

    const seen = (await (await app.call(`/api/orders/${order.id}`, { headers })).json()) as Order;
    expect(seen).toMatchObject({ status: 'PICKED_UP', preparationTime: 60 });
    expect(seen.statusHistory.map((s) => s.status)).toEqual([
      'PENDING_PAYMENT',
      'PAID',
      'ACCEPTED',
      'PREPARING',
      'DELAYED',
      'READY',
      'PICKED_UP',
    ]);
    expect(seen.statusHistory.find((s) => s.status === 'DELAYED')?.note).toBe('Daudz pasūtījumu');
  });

  it('cancelling a paid order refunds it in full through Stripe; an unpaid one is just cancelled', async () => {
    const app = await setup();
    const { cookie } = await app.login('cook@sushiriga.lv');
    const { order } = await app.paidOrder();
    const res = await app.call(`/api/admin/orders/${order.id}/status`, {
      json: { status: 'CANCELLED', note: 'Nav produktu' },
      cookie,
    });
    expect(res.status).toBe(200);
    const cancelled = (await res.json()) as AdminOrder;
    expect(cancelled).toMatchObject({ status: 'CANCELLED', paymentStatus: 'refunded' });
    expect(cancelled.statusHistory.at(-1)?.note).toBe('Nav produktu · refund re_1 (succeeded)');
    // A late (retried) success event does not hide the refund from staff.
    app.store.payments.setStatus('pi_1', 'succeeded', new Date());
    expect(app.store.payments.find(order.id)?.status).toBe('refunded');
    expect(app.fake.refunds).toEqual([
      { paymentIntent: 'pi_1', idempotencyKey: `sushiriga:refund:${order.id}` },
    ]);

    const unpaid = (await app.placeOrder()).order;
    await app.call(`/api/admin/orders/${unpaid.id}/status`, {
      json: { status: 'CANCELLED' },
      cookie,
    });
    expect(app.fake.refunds).toHaveLength(1);
    expect(app.store.orders.find(unpaid.id)?.status).toBe('CANCELLED');
  });

  it('day summary: paid orders, revenue and tips', async () => {
    const app = await setup();
    const { cookie } = await app.login('cook@sushiriga.lv');
    await app.paidOrder();
    await app.paidOrder();
    await app.placeOrder(); // unpaid: not counted
    expect(await (await app.call('/api/admin/summary', { cookie })).json()).toEqual({
      date: '2026-10-05',
      paidOrders: 2,
      revenue: 2 * 2400,
      tips: 2 * 300,
      cancelled: 0,
    });
  });
});

describe('menu, promo codes and reviews', () => {
  it('staff mark a dish sold out; only admins change prices', async () => {
    const app = await setup();
    const cook = (await app.login('cook@sushiriga.lv')).cookie;
    const boss = (await app.login('boss@sushiriga.lv')).cookie;
    const set = (cookie: string, json: unknown) =>
      app.call('/api/admin/menu/maestro', { json, cookie });

    expect(await (await set(cook, { available: false })).json()).toMatchObject({
      product: { id: 'maestro', available: false },
      availableOverride: false,
    });
    const quote = await app.call('/api/checkout/quote', {
      json: {
        customer: { type: 'guest', name: 'Anna', phone: '+371 20 000 000' },
        items: [{ productId: 'maestro', quantity: 1 }],
        tip: 0,
        locationId: 'location-1',
        pickupTime: 'asap',
      },
    });
    expect(quote.status).toBe(409);

    expect((await set(cook, { price: 999 })).status).toBe(403);
    expect(await (await set(boss, { price: 1100, available: null })).json()).toMatchObject({
      product: { price: 1100, available: true },
      basePrice: 1050,
      priceOverride: 1100,
    });
    expect(await (await set(boss, { price: null })).json()).toMatchObject({
      product: { price: 1050 },
    });
    expect(
      (await app.call('/api/admin/menu/nope', { json: { available: false }, cookie: boss })).status,
    ).toBe(404);
  });

  it('administrators manage promo codes that customers can then use', async () => {
    const app = await setup();
    const cook = (await app.login('cook@sushiriga.lv')).cookie;
    const boss = (await app.login('boss@sushiriga.lv')).cookie;
    const promo = {
      code: 'rudens15',
      type: 'percentage',
      value: 15,
      minOrderValue: 2000,
      active: true,
    };
    expect((await app.call('/api/admin/promo-codes', { json: promo, cookie: cook })).status).toBe(
      403,
    );
    expect(
      await (await app.call('/api/admin/promo-codes', { json: promo, cookie: boss })).json(),
    ).toMatchObject({
      code: 'RUDENS15',
      usageCount: 0,
    });
    expect(
      (await app.call('/api/admin/promo-codes', { json: { ...promo, value: 150 }, cookie: boss }))
        .status,
    ).toBe(400);
    expect(
      (await app.call('/api/admin/promo-codes', { json: { ...promo, code: 'a b' }, cookie: boss }))
        .status,
    ).toBe(400);

    const check = await app.call('/api/promo/validate', {
      json: { code: 'Rudens15', subtotal: 3000 },
    });
    expect(await check.json()).toEqual({ valid: true, code: 'RUDENS15', discount: 450 });

    await app.call('/api/admin/promo-codes', { json: { ...promo, active: false }, cookie: boss });
    const off = await app.call('/api/promo/validate', {
      json: { code: 'RUDENS15', subtotal: 3000 },
    });
    expect(await off.json()).toMatchObject({ valid: false, reason: 'inactive' });
  });

  it('administrators publish reviews; until then they are not public', async () => {
    const app = await setup();
    const cook = (await app.login('cook@sushiriga.lv')).cookie;
    const boss = (await app.login('boss@sushiriga.lv')).cookie;
    const { order, headers } = await app.paidOrder();
    app.store.orders.save({ ...app.store.orders.find(order.id)!, status: 'PICKED_UP' });
    await app.call(`/api/orders/${order.id}/review`, {
      json: { rating: 5, comment: 'Super' },
      headers,
    });

    expect((await app.call('/api/admin/reviews', { cookie: cook })).status).toBe(403);
    const pending = (await (
      await app.call('/api/admin/reviews?status=pending', { cookie: boss })
    ).json()) as {
      id: string;
    }[];
    expect(pending).toHaveLength(1);
    expect(await (await app.call('/api/reviews')).json()).toEqual([]);
    await app.call(`/api/admin/reviews/${pending[0]!.id}`, {
      json: { status: 'published' },
      cookie: boss,
    });
    expect(await (await app.call('/api/reviews')).json()).toMatchObject([
      { rating: 5, comment: 'Super' },
    ]);
  });
});
