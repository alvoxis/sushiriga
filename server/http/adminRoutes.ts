import { Hono, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { ORDER_STATUSES, type OrderStatus, type StaffRole, type StaffUser } from '@/types';
import type { AdminService } from '../services/admin';
import { SESSION_TTL_MS, type StaffService } from '../services/staff';
import { parseBody } from './body';
import { apiError } from './errors';
import {
  acceptSchema,
  loginSchema,
  moderationSchema,
  preparationTimeSchema,
  productChangeSchema,
  promoCodeSchema,
  statusSchema,
} from './schemas';

/** HttpOnly session cookie, only sent to the admin API. */
export const SESSION_COOKIE = 'sr_staff';
/**
 * Every state-changing admin request must carry this header. Browsers never add custom headers to
 * cross-site form posts, and the API does not allow it cross-origin — so no CSRF.
 */
export const ADMIN_HEADER = 'X-SushiRiga-Admin';

type AdminEnv = { Variables: { staff: StaffUser } };

export interface AdminRouteDeps {
  staff: StaffService;
  admin: AdminService;
  production: boolean;
  loginLimit: MiddlewareHandler;
}

export function createAdminRoutes({ staff, admin, production, loginLimit }: AdminRouteDeps) {
  const routes = new Hono<AdminEnv>();

  routes.use('*', async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.header(ADMIN_HEADER) !== '1') {
      return apiError(c, 403, 'forbidden', 'Missing admin request header');
    }
    await next();
  });

  routes.post('/login', loginLimit, async (c) => {
    const body = await parseBody(c, loginSchema);
    if (body instanceof Response) return body;
    const session = await staff.login(body.email, body.password);
    if (!session) return apiError(c, 401, 'invalid-credentials', 'Wrong e-mail or password');
    setCookie(c, SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: production,
      sameSite: 'Strict',
      path: '/api/admin',
      maxAge: SESSION_TTL_MS / 1000,
    });
    return c.json(session.user);
  });

  routes.post('/logout', (c) => {
    staff.logout(getCookie(c, SESSION_COOKIE));
    deleteCookie(c, SESSION_COOKIE, { path: '/api/admin', secure: production });
    return c.body(null, 204);
  });

  const requireStaff =
    (role?: StaffRole): MiddlewareHandler<AdminEnv> =>
    async (c, next) => {
      const user = staff.authenticate(getCookie(c, SESSION_COOKIE));
      if (!user) return apiError(c, 401, 'unauthorized', 'Please sign in');
      if (role === 'admin' && user.role !== 'admin') {
        return apiError(c, 403, 'forbidden', 'Only an administrator can do this');
      }
      c.set('staff', user);
      await next();
    };

  routes.get('/me', requireStaff(), (c) => c.json(c.get('staff')));

  // ---------- Orders (all staff) ----------
  routes.get('/orders', requireStaff(), (c) => {
    const status = c.req
      .query('status')
      ?.split(',')
      .filter((s): s is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(s));
    const locationId = c.req.query('location');
    return c.json(
      admin.listOrders({
        ...(status?.length ? { status } : {}),
        ...(locationId ? { locationId } : {}),
        limit: 300,
      }),
    );
  });

  routes.get('/orders/:id', requireStaff(), (c) => c.json(admin.getOrder(c.req.param('id'))));

  routes.post('/orders/:id/accept', requireStaff(), async (c) => {
    const body = await parseBody(c, acceptSchema);
    if (body instanceof Response) return body;
    return c.json(admin.accept(c.req.param('id'), body.preparationTime));
  });

  routes.post('/orders/:id/status', requireStaff(), async (c) => {
    const body = await parseBody(c, statusSchema);
    if (body instanceof Response) return body;
    return c.json(await admin.updateStatus(c.req.param('id'), body.status, body.note));
  });

  routes.post('/orders/:id/preparation-time', requireStaff(), async (c) => {
    const body = await parseBody(c, preparationTimeSchema);
    if (body instanceof Response) return body;
    return c.json(admin.setPreparationTime(c.req.param('id'), body.minutes));
  });

  routes.get('/summary', requireStaff(), (c) => c.json(admin.summary(c.req.query('date'))));

  // ---------- Menu: staff mark dishes sold out; only admins change prices ----------
  routes.get('/menu', requireStaff(), (c) => c.json(admin.menu()));

  routes.post('/menu/:productId', requireStaff(), async (c) => {
    const body = await parseBody(c, productChangeSchema);
    if (body instanceof Response) return body;
    if (body.price !== undefined && c.get('staff').role !== 'admin') {
      return apiError(c, 403, 'forbidden', 'Only an administrator can change prices');
    }
    return c.json(
      admin.setProduct(c.req.param('productId'), {
        ...(body.available !== undefined ? { available: body.available } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
      }),
    );
  });

  // ---------- Promo codes and reviews (administrators) ----------
  routes.get('/promo-codes', requireStaff('admin'), (c) => c.json(admin.promoCodes()));

  routes.post('/promo-codes', requireStaff('admin'), async (c) => {
    const body = await parseBody(c, promoCodeSchema);
    if (body instanceof Response) return body;
    const { minOrderValue, expiresAt, usageLimit, customerId, ...rest } = body;
    return c.json(
      admin.savePromoCode({
        ...rest,
        ...(minOrderValue !== undefined ? { minOrderValue } : {}),
        ...(expiresAt !== undefined ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        ...(usageLimit !== undefined ? { usageLimit } : {}),
        ...(customerId !== undefined ? { customerId } : {}),
      }),
    );
  });

  routes.get('/reviews', requireStaff('admin'), (c) => {
    const status = c.req.query('status');
    const valid = status === 'pending' || status === 'published' || status === 'rejected';
    return c.json(admin.reviews(valid ? status : null));
  });

  routes.post('/reviews/:id', requireStaff('admin'), async (c) => {
    const body = await parseBody(c, moderationSchema);
    if (body instanceof Response) return body;
    return c.json(admin.moderateReview(c.req.param('id'), body.status));
  });

  return routes;
}
