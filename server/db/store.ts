import type {
  StaffRole,
  StaffUser,
  CheckoutQuote,
  CheckoutRequest,
  Order,
  OrderStatus,
  PromoCode,
  PublishedReview,
  Rating,
  Review,
} from '@/types';
import { transaction, type Database } from './database';

export type ReviewStatus = 'pending' | 'published' | 'rejected';

export interface StoredReview extends Review {
  status: ReviewStatus;
}

export interface PaymentRecord {
  orderId: string;
  provider: 'stripe';
  intentId: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentRow {
  order_id: string;
  provider: 'stripe';
  intent_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const paymentFromRow = (row: PaymentRow): PaymentRecord => ({
  orderId: row.order_id,
  provider: row.provider,
  intentId: row.intent_id,
  amount: row.amount,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface StoredStaffUser extends StaffUser {
  passwordHash: string;
  disabled: boolean;
  createdAt: string;
}

interface StaffRow {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  password_hash: string;
  disabled: number;
  created_at: string;
}

const staffFromRow = (row: StaffRow): StoredStaffUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  passwordHash: row.password_hash,
  disabled: row.disabled === 1,
  createdAt: row.created_at,
});

export interface ProductOverride {
  productId: string;
  available: boolean | null;
  price: number | null;
  updatedAt: string;
}

interface PromoRow {
  code: string;
  type: PromoCode['type'];
  value: number;
  min_order_value: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  active: number;
  visibility: PromoCode['visibility'];
  customer_id: string | null;
}

interface ReviewRow {
  id: string;
  order_id: string;
  rating: number;
  food_rating: number | null;
  service_rating: number | null;
  speed_rating: number | null;
  comment: string | null;
  status: ReviewStatus;
  created_at: string;
}

function promoFromRow(row: PromoRow): PromoCode {
  return {
    code: row.code,
    type: row.type,
    value: row.value,
    ...(row.min_order_value !== null ? { minOrderValue: row.min_order_value } : {}),
    ...(row.expires_at !== null ? { expiresAt: row.expires_at } : {}),
    ...(row.usage_limit !== null ? { usageLimit: row.usage_limit } : {}),
    usageCount: row.usage_count,
    active: row.active === 1,
    visibility: row.visibility,
    ...(row.customer_id !== null ? { customerId: row.customer_id } : {}),
  };
}

function reviewFromRow(row: ReviewRow): StoredReview {
  return {
    id: row.id,
    orderId: row.order_id,
    rating: row.rating as Rating,
    ...(row.food_rating !== null ? { foodRating: row.food_rating as Rating } : {}),
    ...(row.service_rating !== null ? { serviceRating: row.service_rating as Rating } : {}),
    ...(row.speed_rating !== null ? { speedRating: row.speed_rating as Rating } : {}),
    ...(row.comment !== null ? { comment: row.comment } : {}),
    status: row.status,
    createdAt: row.created_at,
  };
}

/** All SQL lives here. Everything uses prepared statements with bound parameters. */
export function createStore(db: Database) {
  const sql = {
    insertQuote: db.prepare(
      'INSERT INTO quotes (id, request, quote, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    ),
    findQuote: db.prepare('SELECT request, quote, expires_at FROM quotes WHERE id = ?'),
    deleteExpiredQuotes: db.prepare(
      'DELETE FROM quotes WHERE expires_at < ? AND id NOT IN (SELECT quote_id FROM orders)',
    ),
    insertOrder: db.prepare(
      `INSERT INTO orders (id, quote_id, location_id, status, total, created_at, updated_at, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ),
    findOrder: db.prepare('SELECT data FROM orders WHERE id = ?'),
    findOrderByQuote: db.prepare('SELECT data FROM orders WHERE quote_id = ?'),
    updateOrder: db.prepare(
      'UPDATE orders SET status = ?, total = ?, updated_at = ?, data = ? WHERE id = ?',
    ),
    listOrders: db.prepare(
      `SELECT data FROM orders
       WHERE (?1 IS NULL OR location_id = ?1) AND (?2 IS NULL OR status IN (SELECT value FROM json_each(?2)))
       ORDER BY created_at DESC LIMIT ?3`,
    ),
    findPromo: db.prepare('SELECT * FROM promo_codes WHERE code = ?'),
    listPromos: db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC'),
    upsertPromo: db.prepare(
      `INSERT INTO promo_codes
         (code, type, value, min_order_value, expires_at, usage_limit, usage_count, active,
          visibility, customer_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (code) DO UPDATE SET
         type = excluded.type, value = excluded.value, min_order_value = excluded.min_order_value,
         expires_at = excluded.expires_at, usage_limit = excluded.usage_limit,
         active = excluded.active, visibility = excluded.visibility,
         customer_id = excluded.customer_id`,
    ),
    incrementPromo: db.prepare(
      'UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = ?',
    ),
    insertReview: db.prepare(
      `INSERT INTO reviews
         (id, order_id, rating, food_rating, service_rating, speed_rating, comment, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ),
    findReviewByOrder: db.prepare('SELECT * FROM reviews WHERE order_id = ?'),
    findReview: db.prepare('SELECT * FROM reviews WHERE id = ?'),
    listReviews: db.prepare(
      `SELECT * FROM reviews WHERE (?1 IS NULL OR status = ?1) ORDER BY created_at DESC LIMIT ?2`,
    ),
    setReviewStatus: db.prepare('UPDATE reviews SET status = ? WHERE id = ?'),
    listOverrides: db.prepare('SELECT * FROM product_overrides'),
    upsertOverride: db.prepare(
      `INSERT INTO product_overrides (product_id, available, price, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (product_id) DO UPDATE SET
         available = excluded.available, price = excluded.price, updated_at = excluded.updated_at`,
    ),
    deleteOverride: db.prepare('DELETE FROM product_overrides WHERE product_id = ?'),
    findPayment: db.prepare('SELECT * FROM payments WHERE order_id = ?'),
    findPaymentByIntent: db.prepare('SELECT * FROM payments WHERE intent_id = ?'),
    upsertPayment: db.prepare(
      `INSERT INTO payments (order_id, provider, intent_id, amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (order_id) DO UPDATE SET
         provider = excluded.provider, intent_id = excluded.intent_id, amount = excluded.amount,
         status = excluded.status, updated_at = excluded.updated_at`,
    ),
    setPaymentStatus: db.prepare(
      // A refund is final: late provider events never turn it back into "succeeded".
      "UPDATE payments SET status = ?, updated_at = ? WHERE intent_id = ? AND status != 'refunded'",
    ),
    findWebhookEvent: db.prepare('SELECT 1 FROM webhook_events WHERE id = ?'),
    insertStaff: db.prepare(
      `INSERT INTO staff_users (id, email, name, role, password_hash, disabled, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
    ),
    findStaffByEmail: db.prepare('SELECT * FROM staff_users WHERE email = ?'),
    findStaff: db.prepare('SELECT * FROM staff_users WHERE id = ?'),
    listStaff: db.prepare('SELECT * FROM staff_users ORDER BY created_at'),
    setStaffPassword: db.prepare('UPDATE staff_users SET password_hash = ? WHERE id = ?'),
    setStaffDisabled: db.prepare('UPDATE staff_users SET disabled = ? WHERE id = ?'),
    insertSession: db.prepare(
      'INSERT INTO staff_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    ),
    findSession: db.prepare('SELECT user_id, expires_at FROM staff_sessions WHERE token_hash = ?'),
    deleteSession: db.prepare('DELETE FROM staff_sessions WHERE token_hash = ?'),
    deleteUserSessions: db.prepare('DELETE FROM staff_sessions WHERE user_id = ?'),
    deleteExpiredSessions: db.prepare('DELETE FROM staff_sessions WHERE expires_at < ?'),
    insertWebhookEvent: db.prepare(
      'INSERT OR IGNORE INTO webhook_events (id, type, received_at) VALUES (?, ?, ?)',
    ),
  };

  const parseOrder = (row: unknown): Order | undefined =>
    row ? (JSON.parse((row as { data: string }).data) as Order) : undefined;

  return {
    transaction: <T>(work: () => T) => transaction(db, work),

    quotes: {
      save(quote: CheckoutQuote, request: CheckoutRequest, now: Date, ttlMs: number): void {
        sql.insertQuote.run(
          quote.quoteId,
          JSON.stringify(request),
          JSON.stringify(quote),
          now.toISOString(),
          new Date(now.getTime() + ttlMs).toISOString(),
        );
      },
      /** The quote and its request, or undefined if unknown. `expired` is reported separately. */
      find(id: string, now: Date) {
        const row = sql.findQuote.get(id) as
          { request: string; quote: string; expires_at: string } | undefined;
        if (!row) return undefined;
        return {
          request: JSON.parse(row.request) as CheckoutRequest,
          quote: JSON.parse(row.quote) as CheckoutQuote,
          expired: Date.parse(row.expires_at) < now.getTime(),
        };
      },
      deleteExpired(now: Date): void {
        sql.deleteExpiredQuotes.run(now.toISOString());
      },
    },

    orders: {
      insert(order: Order, quoteId: string): void {
        sql.insertOrder.run(
          order.id,
          quoteId,
          order.location,
          order.status,
          order.total,
          order.createdAt,
          order.updatedAt,
          JSON.stringify(order),
        );
      },
      find: (id: string) => parseOrder(sql.findOrder.get(id)),
      findByQuote: (quoteId: string) => parseOrder(sql.findOrderByQuote.get(quoteId)),
      save(order: Order): void {
        sql.updateOrder.run(
          order.status,
          order.total,
          order.updatedAt,
          JSON.stringify(order),
          order.id,
        );
      },
      list(filter: { locationId?: string; status?: OrderStatus[]; limit?: number } = {}): Order[] {
        return sql.listOrders
          .all(
            filter.locationId ?? null,
            filter.status ? JSON.stringify(filter.status) : null,
            filter.limit ?? 200,
          )
          .map((row) => parseOrder(row)!);
      },
    },

    promo: {
      find(code: string): PromoCode | undefined {
        const row = sql.findPromo.get(code) as PromoRow | undefined;
        return row ? promoFromRow(row) : undefined;
      },
      list: (): PromoCode[] => (sql.listPromos.all() as unknown as PromoRow[]).map(promoFromRow),
      upsert(promo: PromoCode, now: Date): void {
        sql.upsertPromo.run(
          promo.code,
          promo.type,
          promo.value,
          promo.minOrderValue ?? null,
          promo.expiresAt ?? null,
          promo.usageLimit ?? null,
          promo.usageCount,
          promo.active ? 1 : 0,
          promo.visibility,
          promo.customerId ?? null,
          now.toISOString(),
        );
      },
      incrementUsage(code: string): void {
        sql.incrementPromo.run(code);
      },
    },

    reviews: {
      insert(review: Review): void {
        sql.insertReview.run(
          review.id,
          review.orderId,
          review.rating,
          review.foodRating ?? null,
          review.serviceRating ?? null,
          review.speedRating ?? null,
          review.comment ?? null,
          review.createdAt,
        );
      },
      findByOrder(orderId: string): StoredReview | undefined {
        const row = sql.findReviewByOrder.get(orderId) as ReviewRow | undefined;
        return row ? reviewFromRow(row) : undefined;
      },
      find(id: string): StoredReview | undefined {
        const row = sql.findReview.get(id) as ReviewRow | undefined;
        return row ? reviewFromRow(row) : undefined;
      },
      list(status: ReviewStatus | null, limit = 200): StoredReview[] {
        return (sql.listReviews.all(status, limit) as unknown as ReviewRow[]).map(reviewFromRow);
      },
      listPublished(limit = 100): PublishedReview[] {
        return this.list('published', limit).map((review) => ({
          id: review.id,
          rating: review.rating,
          ...(review.foodRating ? { foodRating: review.foodRating } : {}),
          ...(review.serviceRating ? { serviceRating: review.serviceRating } : {}),
          ...(review.speedRating ? { speedRating: review.speedRating } : {}),
          ...(review.comment ? { comment: review.comment } : {}),
          createdAt: review.createdAt,
        }));
      },
      setStatus(id: string, status: ReviewStatus): boolean {
        return Number(sql.setReviewStatus.run(status, id).changes) > 0;
      },
    },

    payments: {
      find(orderId: string): PaymentRecord | undefined {
        const row = sql.findPayment.get(orderId) as PaymentRow | undefined;
        return row ? paymentFromRow(row) : undefined;
      },
      findByIntent(intentId: string): PaymentRecord | undefined {
        const row = sql.findPaymentByIntent.get(intentId) as PaymentRow | undefined;
        return row ? paymentFromRow(row) : undefined;
      },
      save(payment: Omit<PaymentRecord, 'createdAt' | 'updatedAt'>, now: Date): void {
        const at = now.toISOString();
        sql.upsertPayment.run(
          payment.orderId,
          payment.provider,
          payment.intentId,
          payment.amount,
          payment.status,
          at,
          at,
        );
      },
      setStatus(intentId: string, status: string, now: Date): void {
        sql.setPaymentStatus.run(status, now.toISOString(), intentId);
      },
    },

    webhookEvents: {
      has: (id: string): boolean => sql.findWebhookEvent.get(id) !== undefined,
      /** Records an event id; false if it was already processed. */
      record(id: string, type: string, now: Date): boolean {
        return Number(sql.insertWebhookEvent.run(id, type, now.toISOString()).changes) > 0;
      },
    },

    staff: {
      insert(user: Omit<StoredStaffUser, 'disabled'>): void {
        sql.insertStaff.run(
          user.id,
          user.email,
          user.name,
          user.role,
          user.passwordHash,
          user.createdAt,
        );
      },
      findByEmail(email: string): StoredStaffUser | undefined {
        const row = sql.findStaffByEmail.get(email) as StaffRow | undefined;
        return row ? staffFromRow(row) : undefined;
      },
      find(id: string): StoredStaffUser | undefined {
        const row = sql.findStaff.get(id) as StaffRow | undefined;
        return row ? staffFromRow(row) : undefined;
      },
      list: (): StoredStaffUser[] =>
        (sql.listStaff.all() as unknown as StaffRow[]).map(staffFromRow),
      setPassword(id: string, passwordHash: string): void {
        sql.setStaffPassword.run(passwordHash, id);
      },
      setDisabled(id: string, disabled: boolean): void {
        sql.setStaffDisabled.run(disabled ? 1 : 0, id);
      },
    },

    sessions: {
      insert(tokenHash: string, userId: string, now: Date, expiresAt: Date): void {
        sql.insertSession.run(tokenHash, userId, now.toISOString(), expiresAt.toISOString());
      },
      find(tokenHash: string): { userId: string; expiresAt: string } | undefined {
        const row = sql.findSession.get(tokenHash) as
          { user_id: string; expires_at: string } | undefined;
        return row ? { userId: row.user_id, expiresAt: row.expires_at } : undefined;
      },
      delete(tokenHash: string): void {
        sql.deleteSession.run(tokenHash);
      },
      deleteForUser(userId: string): void {
        sql.deleteUserSessions.run(userId);
      },
      deleteExpired(now: Date): void {
        sql.deleteExpiredSessions.run(now.toISOString());
      },
    },

    overrides: {
      list(): ProductOverride[] {
        return (
          sql.listOverrides.all() as {
            product_id: string;
            available: number | null;
            price: number | null;
            updated_at: string;
          }[]
        ).map((row) => ({
          productId: row.product_id,
          available: row.available === null ? null : row.available === 1,
          price: row.price,
          updatedAt: row.updated_at,
        }));
      },
      set(
        productId: string,
        change: { available: boolean | null; price: number | null },
        now: Date,
      ) {
        if (change.available === null && change.price === null) {
          sql.deleteOverride.run(productId);
          return;
        }
        sql.upsertOverride.run(
          productId,
          change.available === null ? null : change.available ? 1 : 0,
          change.price,
          now.toISOString(),
        );
      },
    },
  };
}

export type Store = ReturnType<typeof createStore>;
