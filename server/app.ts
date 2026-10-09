import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { z } from 'zod';
import { evaluatePromo, normalizePromoCode } from '@/features/promo/evaluatePromo';
import type { ServerConfig } from './config';
import type { Store } from './db/store';
import { apiError, handleError } from './http/errors';
import { rateLimit } from './http/rateLimit';
import {
  checkoutRequestSchema,
  placeOrderSchema,
  promoValidateSchema,
  reviewSchema,
} from './http/schemas';
import type { CatalogService } from './services/catalog';
import type { OrderService } from './services/orders';
import type { ReviewService } from './services/reviews';

export interface AppDeps {
  config: Pick<ServerConfig, 'corsOrigins' | 'publicDir' | 'trustProxy' | 'production'>;
  store: Store;
  catalog: CatalogService;
  orders: OrderService;
  reviews: ReviewService;
  now: () => Date;
}

/** Header carrying a guest order's access token (see security/tokens.ts). */
export const ORDER_TOKEN_HEADER = 'X-Order-Token';

const MINUTE = 60_000;

async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<z.infer<S> | Response> {
  const raw: unknown = await c.req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    return apiError(c, 400, 'invalid-request', `Invalid request: ${fields.join(', ') || 'body'}`);
  }
  return parsed.data;
}

export function createApp(deps: AppDeps) {
  const { config, store, catalog, orders, reviews } = deps;
  const app = new Hono();

  const clientIp = (c: Context): string => {
    if (config.trustProxy) {
      // Behind ONE trusted reverse proxy: it appends the real client address last.
      const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
      if (forwarded) return forwarded;
    }
    try {
      return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown'; // in-process requests (tests)
    }
  };
  const limit = (name: string, perMinute: number) =>
    rateLimit({ name, limit: perMinute, windowMs: MINUTE, clientKey: clientIp });

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
      },
      strictTransportSecurity: config.production ? 'max-age=31536000; includeSubDomains' : false,
      crossOriginEmbedderPolicy: false,
      permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: ['self'] },
    }),
  );

  // ---------- API ----------
  const api = new Hono();
  if (config.corsOrigins.length) {
    api.use(
      '*',
      cors({
        origin: config.corsOrigins,
        allowHeaders: ['Content-Type', ORDER_TOKEN_HEADER],
        allowMethods: ['GET', 'POST'],
        maxAge: 600,
      }),
    );
  }
  api.use('*', bodyLimit({ maxSize: 32 * 1024 }));
  api.use('*', async (c, next) => {
    await next();
    if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
  });

  // `time` lets clients (and e2e tests) see the server clock that pickup rules use.
  api.get('/health', (c) => c.json({ ok: true, time: deps.now().toISOString() }));

  api.get('/catalog', (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(catalog.catalog());
  });

  api.get('/locations', (c) => {
    c.header('Cache-Control', 'public, max-age=300');
    return c.json(catalog.activeLocations());
  });

  api.post('/promo/validate', limit('promo', 20), async (c) => {
    const body = await parseBody(c, promoValidateSchema);
    if (body instanceof Response) return body;
    const code = normalizePromoCode(body.code);
    // No accounts yet → no customer id: personal codes are never eligible here.
    return c.json(
      evaluatePromo(store.promo.find(code), code, { subtotal: body.subtotal, now: deps.now() }),
    );
  });

  api.post('/checkout/quote', limit('quote', 30), async (c) => {
    const body = await parseBody(c, checkoutRequestSchema);
    if (body instanceof Response) return body;
    return c.json(orders.quote(body));
  });

  api.post('/orders', limit('orders', 10), async (c) => {
    const body = await parseBody(c, placeOrderSchema);
    if (body instanceof Response) return body;
    const { order, token } = orders.place(body.quoteId);
    return c.json({ order, accessToken: token }, 201);
  });

  const orderRead = limit('order-read', 120);
  api.get('/orders/:id', orderRead, (c) =>
    c.json(orders.get(c.req.param('id'), c.req.header(ORDER_TOKEN_HEADER))),
  );

  api.get('/orders/:id/review', orderRead, (c) => {
    const order = orders.get(c.req.param('id'), c.req.header(ORDER_TOKEN_HEADER));
    return c.json({ review: reviews.forOrder(order.id) ?? null });
  });

  api.post('/orders/:id/review', limit('review', 5), async (c) => {
    const order = orders.get(c.req.param('id'), c.req.header(ORDER_TOKEN_HEADER));
    const body = await parseBody(c, reviewSchema);
    if (body instanceof Response) return body;
    return c.json(reviews.submit(order.id, body), 201);
  });

  api.get('/reviews', (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(reviews.listPublished());
  });

  api.all('*', (c) => apiError(c, 404, 'not-found', 'No such endpoint'));
  app.route('/api', api);

  // ---------- Frontend (single-page app) ----------
  const publicDir = config.publicDir ? resolve(config.publicDir) : null;
  const indexFile = publicDir ? join(publicDir, 'index.html') : null;
  if (publicDir && indexFile && existsSync(indexFile)) {
    const indexHtml = readFileSync(indexFile, 'utf8');
    // Hashed build files never change; everything else is revalidated.
    app.use('*', async (c, next) => {
      await next();
      if (c.res.ok && !c.res.headers.has('Cache-Control')) {
        c.res.headers.set(
          'Cache-Control',
          c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      }
    });
    app.use('*', serveStatic({ root: publicDir }));
    // Client-side routes (/menu/rolli, /order/SR-…) get the app; missing files stay 404.
    app.get('*', (c) => {
      if (/\.[a-z0-9]+$/i.test(c.req.path)) return c.text('Not found', 404);
      c.header('Cache-Control', 'no-cache');
      return c.html(indexHtml);
    });
  }

  app.onError(handleError);
  return app;
}
