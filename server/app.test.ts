import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CheckoutQuote, CheckoutRequest, Order } from '@/types';
import type { ServerConfig } from './config';
import { createServerContext } from './context';

const riga = (time: string, day = '05') => new Date(`2026-10-${day}T${time}:00+03:00`); // Monday

function setup(overrides: Partial<ServerConfig> = {}) {
  let now = riga('12:00');
  const config: ServerConfig = {
    production: false,
    host: '127.0.0.1',
    port: 0,
    databasePath: ':memory:',
    orderTokenSecret: 'test-secret-test-secret-test-secret-42',
    corsOrigins: [],
    publicDir: null,
    trustProxy: false,
    stripe: null,
    ...overrides,
  };
  const context = createServerContext(config, () => now);
  const call = (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const { json, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (json !== undefined) headers.set('Content-Type', 'application/json');
    return context.app.request(path, {
      ...rest,
      headers,
      ...(json !== undefined ? { method: rest.method ?? 'POST', body: JSON.stringify(json) } : {}),
    });
  };
  return {
    ...context,
    call,
    setNow: (date: Date) => {
      now = date;
    },
  };
}

const request: CheckoutRequest = {
  customer: { type: 'guest', name: ' Anna Bērziņa ', phone: '+371 20 000 000', email: '' },
  items: [
    { productId: 'maestro', quantity: 2 },
    { productId: 'poke-eel', quantity: 1 },
  ],
  tip: 200,
  locationId: 'location-1',
  pickupTime: 'asap',
};

async function quoteAndPlace(app: ReturnType<typeof setup>, body: CheckoutRequest = request) {
  const quote = (await (
    await app.call('/api/checkout/quote', { json: body })
  ).json()) as CheckoutQuote;
  const res = await app.call('/api/orders', { json: { quoteId: quote.quoteId } });
  return { quote, res, ...((await res.json()) as { order: Order; accessToken: string }) };
}

describe('public data', () => {
  it('serves health, the catalog and active locations', async () => {
    const app = setup();
    expect(await (await app.call('/api/health')).json()).toEqual({
      ok: true,
      time: riga('12:00').toISOString(),
    });
    const catalog = (await (await app.call('/api/catalog')).json()) as {
      products: unknown[];
      categories: unknown[];
    };
    expect(catalog.products).toHaveLength(99);
    expect(catalog.categories.length).toBeGreaterThanOrEqual(13);
    const locations = (await (await app.call('/api/locations')).json()) as { id: string }[];
    expect(locations.map((l) => l.id)).toEqual(['location-1']);
  });

  it('applies staff overrides (sold out, price) on top of the menu', async () => {
    const app = setup();
    app.store.overrides.set('maestro', { available: false, price: null }, new Date());
    app.store.overrides.set('poke-eel', { available: null, price: 1500 }, new Date());
    const { products } = (await (await app.call('/api/catalog')).json()) as {
      products: { id: string; available: boolean; price: number }[];
    };
    expect(products.find((p) => p.id === 'maestro')?.available).toBe(false);
    expect(products.find((p) => p.id === 'poke-eel')?.price).toBe(1500);
    const res = await app.call('/api/checkout/quote', { json: request });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: 'unavailable-product' } });
  });
});

describe('checkout quote — the server prices everything', () => {
  it('prices from its own catalog and ignores amounts a client adds', async () => {
    const app = setup();
    const tampered = {
      ...request,
      items: [{ productId: 'maestro', quantity: 2, unitPrice: 1, lineTotal: 2 }],
      subtotal: 1,
      total: 1,
    };
    const res = await app.call('/api/checkout/quote', { json: tampered });
    expect(res.status).toBe(200);
    const quote = (await res.json()) as CheckoutQuote;
    expect(quote).toMatchObject({ subtotal: 2100, discount: 0, tip: 200, total: 2300 });
    expect(quote.items[0]).toMatchObject({ unitPrice: 1050, lineTotal: 2100 });
    expect(quote.quoteId).toMatch(/^quote_[\w-]{22}$/);
  });

  it('applies promo codes from the database and explains rejections', async () => {
    const app = setup();
    const base = { usageCount: 0, active: true, visibility: 'public' as const };
    app.store.promo.upsert(
      { code: 'RUDENS10', type: 'percentage', value: 10, ...base },
      riga('09:00'),
    );
    app.store.promo.upsert(
      { code: 'OLD', type: 'fixed', value: 300, expiresAt: '2026-01-01T00:00:00Z', ...base },
      riga('09:00'),
    );
    app.store.promo.upsert(
      { code: 'VIP', type: 'fixed', value: 300, ...base, visibility: 'personal', customerId: 'c1' },
      riga('09:00'),
    );
    const quote = async (promoCode: string) =>
      (await (
        await app.call('/api/checkout/quote', { json: { ...request, promoCode } })
      ).json()) as CheckoutQuote;
    expect(await quote(' rudens10 ')).toMatchObject({
      discount: 350,
      promoCode: 'RUDENS10',
      total: 3350,
    });
    expect(await quote('OLD')).toMatchObject({ discount: 0, promoRejected: 'expired' });
    expect(await quote('NOPE')).toMatchObject({ discount: 0, promoRejected: 'not-found' });
    expect(await quote('VIP')).toMatchObject({ promoRejected: 'not-eligible' });

    const validate = await app.call('/api/promo/validate', {
      json: { code: 'rudens10', subtotal: 2000 },
    });
    expect(await validate.json()).toEqual({ valid: true, code: 'RUDENS10', discount: 200 });
  });

  it.each([
    ['no body', undefined],
    ['empty cart', { ...request, items: [] }],
    ['fractional quantity', { ...request, items: [{ productId: 'maestro', quantity: 1.5 }] }],
    ['negative tip', { ...request, tip: -1 }],
    [
      'account customer (no accounts yet)',
      { ...request, customer: { ...request.customer, type: 'registered' } },
    ],
    ['huge promo string', { ...request, promoCode: 'X'.repeat(500) }],
  ])('rejects a malformed request: %s', async (_name, body) => {
    const res = await setup().call('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'invalid-request' } });
  });

  it('checks the guest contact details', async () => {
    const res = await setup().call('/api/checkout/quote', {
      json: { ...request, customer: { type: 'guest', name: 'A', phone: '12' } },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'invalid-contact' } });
  });

  it('only accepts pickup times the restaurant can meet', async () => {
    const app = setup();
    const at = async (pickupTime: string) =>
      (await app.call('/api/checkout/quote', { json: { ...request, pickupTime } })).status;
    expect(await at(riga('12:30').toISOString())).toBe(200); // now + 30 min, on the grid
    expect(await at(riga('12:15').toISOString())).toBe(409); // sooner than 30 min
    expect(await at(riga('22:15').toISOString())).toBe(409); // after closing
    expect(await at(riga('12:37').toISOString())).toBe(409); // not an offered slot
    expect(await at('not a time')).toBe(400);
    app.setNow(riga('21:45'));
    expect(await at('asap')).toBe(409); // cannot be ready before closing
  });
});

describe('orders', () => {
  it('creates a PENDING_PAYMENT guest order with an access token, exactly once per quote', async () => {
    const app = setup();
    const { quote, res, order, accessToken } = await quoteAndPlace(app);
    expect(res.status).toBe(201);
    expect(order).toMatchObject({
      status: 'PENDING_PAYMENT',
      payment: null,
      total: 3700, // 2 × 10.50 + 14.00 + 2.00 tip
      preparationTime: null,
      customer: { type: 'guest', name: 'Anna Bērziņa', phone: '+371 20 000 000' },
    });
    expect(order.customer).not.toHaveProperty('email'); // empty e-mail dropped
    expect(order.id).toMatch(/^SR-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(accessToken).toMatch(/^[\w-]{43}$/);

    const again = await app.call('/api/orders', { json: { quoteId: quote.quoteId } });
    expect(await again.json()).toEqual({ order, accessToken });
    expect(app.store.orders.list()).toHaveLength(1);
  });

  it('only the token holder can read an order — unknown and forbidden look the same', async () => {
    const app = setup();
    const { order, accessToken } = await quoteAndPlace(app);
    const read = (id: string, token?: string) =>
      app.call(`/api/orders/${id}`, token ? { headers: { 'X-Order-Token': token } } : {});
    const ok = await read(order.id, accessToken);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
    expect(await ok.json()).toEqual(order);
    for (const res of [
      await read(order.id),
      await read(order.id, 'x'.repeat(43)),
      await read('SR-0000-0000', accessToken),
    ]) {
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ error: { code: 'order-not-found' } });
    }
  });

  it('refuses unknown or expired quotes and pickup times that have passed', async () => {
    const app = setup();
    expect((await app.call('/api/orders', { json: { quoteId: 'quote_nope' } })).status).toBe(404);

    const slot = { ...request, pickupTime: riga('12:30').toISOString() };
    const quote = (await (
      await app.call('/api/checkout/quote', { json: slot })
    ).json()) as CheckoutQuote;
    app.setNow(riga('12:10')); // 12:30 is now closer than 30 minutes
    const late = await app.call('/api/orders', { json: { quoteId: quote.quoteId } });
    expect(late.status).toBe(409);
    expect(await late.json()).toMatchObject({ error: { code: 'pickup-unavailable' } });

    app.setNow(riga('12:00'));
    const asap = (await (
      await app.call('/api/checkout/quote', { json: request })
    ).json()) as CheckoutQuote;
    app.setNow(riga('12:31'));
    expect((await app.call('/api/orders', { json: { quoteId: asap.quoteId } })).status).toBe(404);
  });

  it('limits how fast one client can place orders', async () => {
    const app = setup();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await app.call('/api/orders', { json: { quoteId: 'quote_nope' } })).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 404)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('reviews', () => {
  it('one moderated review per picked-up order, published without order references', async () => {
    const app = setup();
    const { order, accessToken } = await quoteAndPlace(app);
    const headers = { 'X-Order-Token': accessToken };
    const review = { rating: 5, comment: '  Ļoti garšīgi!  ', foodRating: 4 };
    const submit = () => app.call(`/api/orders/${order.id}/review`, { json: review, headers });

    expect((await submit()).status).toBe(409); // not picked up yet
    app.store.orders.save({ ...order, status: 'PICKED_UP' });
    const created = await submit();
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      rating: 5,
      comment: 'Ļoti garšīgi!',
      orderId: order.id,
    });
    expect((await submit()).status).toBe(409); // only one

    expect((await app.call(`/api/orders/${order.id}/review`, { json: review })).status).toBe(404); // no token
    expect(
      (await app.call(`/api/orders/${order.id}/review`, { json: { rating: 0 }, headers })).status,
    ).toBe(400);

    expect(await (await app.call('/api/reviews')).json()).toEqual([]); // waits for moderation
    const stored = app.store.reviews.findByOrder(order.id)!;
    app.store.reviews.setStatus(stored.id, 'published');
    const published = (await (await app.call('/api/reviews')).json()) as object[];
    expect(published).toHaveLength(1);
    expect(published[0]).not.toHaveProperty('orderId');
    expect(published[0]).toMatchObject({ rating: 5, foodRating: 4 });

    const mine = await app.call(`/api/orders/${order.id}/review`, { headers });
    expect(await mine.json()).toMatchObject({ review: { rating: 5 } });
  });
});

describe('HTTP hardening', () => {
  it('sends security headers, JSON 404s and rejects oversized bodies', async () => {
    const app = setup();
    const res = await app.call('/api/health');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    const missing = await app.call('/api/nope');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: 'not-found' } });
    const big = await app.call('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, padding: 'x'.repeat(40_000) }),
    });
    expect(big.status).toBe(413);
  });

  it('allows cross-origin API calls only from configured origins', async () => {
    const app = setup({ corsOrigins: ['https://sushiriga.lv'] });
    const allowed = await app.call('/api/health', { headers: { Origin: 'https://sushiriga.lv' } });
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://sushiriga.lv');
    const other = await app.call('/api/health', { headers: { Origin: 'https://evil.example' } });
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const none = setup();
    const res = await none.call('/api/health', { headers: { Origin: 'https://evil.example' } });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('serving the built frontend', () => {
  it('serves files, falls back to index.html for app routes and 404s missing files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sushiriga-dist-'));
    try {
      mkdirSync(join(dir, 'assets'));
      writeFileSync(join(dir, 'index.html'), '<!doctype html><title>SUSHIRIGA</title>');
      writeFileSync(join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
      const app = setup({ publicDir: dir });
      const asset = await app.call('/assets/app-abc.js');
      expect(asset.status).toBe(200);
      expect(asset.headers.get('Cache-Control')).toContain('immutable');
      for (const path of ['/', '/menu/rolli', '/order/SR-AAAA-BBBB']) {
        const page = await app.call(path);
        expect(page.status).toBe(200);
        expect(await page.text()).toContain('<title>SUSHIRIGA</title>');
      }
      expect((await app.call('/assets/missing.js')).status).toBe(404);
      expect((await app.call('/api/nope')).headers.get('Content-Type')).toContain('json');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('persistence', () => {
  it('keeps orders in the database file across restarts', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sushiriga-db-'));
    try {
      const databasePath = join(dir, 'nested', 'test.db');
      const first = setup({ databasePath });
      const { order, accessToken } = await quoteAndPlace(first);
      first.db.close();
      const second = setup({ databasePath });
      const res = await second.call(`/api/orders/${order.id}`, {
        headers: { 'X-Order-Token': accessToken },
      });
      expect(await res.json()).toEqual(order);
      second.db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
