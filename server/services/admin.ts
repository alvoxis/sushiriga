import { localDate } from '@/features/pickup/pickupSlots';
import { canTransition } from '@/features/orders/orderStatus';
import { isPreparationTimeOption } from '@/features/pickup/preparationTime';
import { normalizePromoCode } from '@/features/promo/evaluatePromo';
import type {
  AdminOrder,
  AdminProduct,
  AdminReview,
  DaySummary,
  Order,
  OrderStatus,
  PromoCode,
  ReviewModeration,
} from '@/types';
import type { Store } from '../db/store';
import type { PaymentGateway } from '../payments/gateway';
import type { CatalogService } from './catalog';

export type AdminErrorCode =
  | 'not-found'
  | 'invalid-transition'
  | 'invalid-preparation-time'
  | 'invalid-promo'
  | 'refund-unavailable';

export class AdminError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

/** Statuses a paid order passes through after payment (it may need a refund when cancelled). */
const PAID_STATES: readonly OrderStatus[] = [
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'ALMOST_READY',
  'READY',
  'DELAYED',
];

export interface AdminDeps {
  store: Store;
  catalog: CatalogService;
  gateway: PaymentGateway | null;
  now: () => Date;
}

/**
 * What restaurant staff can do. Same rules as the customer side: only a confirmed payment makes
 * an order PAID; accepting it requires choosing the final preparation time (10…80 min);
 * all other changes follow ORDER_TRANSITIONS.
 */
export function createAdminService({ store, catalog, gateway, now }: AdminDeps) {
  const withPayment = (order: Order): AdminOrder => ({
    ...order,
    paymentStatus: store.payments.find(order.id)?.status ?? null,
  });

  function change(id: string, apply: (order: Order, at: string) => Order): AdminOrder {
    return store.transaction(() => {
      const order = store.orders.find(id);
      if (!order) throw new AdminError('not-found', 'Order not found');
      const next = apply(order, now().toISOString());
      store.orders.save(next);
      return withPayment(next);
    });
  }

  function transition(order: Order, status: OrderStatus, at: string, note?: string): Order {
    if (!canTransition(order.status, status)) {
      throw new AdminError(
        'invalid-transition',
        `Cannot change the order from ${order.status} to ${status}`,
      );
    }
    return {
      ...order,
      status,
      statusHistory: [...order.statusHistory, { status, at, ...(note ? { note } : {}) }],
      updatedAt: at,
    };
  }

  return {
    listOrders(filter: { status?: OrderStatus[]; locationId?: string; limit?: number } = {}) {
      return store.orders.list(filter).map(withPayment);
    },

    getOrder(id: string): AdminOrder {
      const order = store.orders.find(id);
      if (!order) throw new AdminError('not-found', 'Order not found');
      return withPayment(order);
    },

    /** PAID → ACCEPTED with the final preparation time chosen by staff. */
    accept(id: string, minutes: number): AdminOrder {
      if (!isPreparationTimeOption(minutes)) {
        throw new AdminError('invalid-preparation-time', 'Choose 10…80 minutes in 5-minute steps');
      }
      return change(id, (order, at) => {
        if (order.status !== 'PAID') {
          throw new AdminError('invalid-transition', `The order is ${order.status}, not PAID`);
        }
        return { ...transition(order, 'ACCEPTED', at), preparationTime: minutes };
      });
    },

    /**
     * Any other allowed change. Never PAID (only a payment does that) and never ACCEPTED (use
     * accept). Cancelling a paid order refunds the payment in full first.
     */
    async updateStatus(id: string, status: OrderStatus, note?: string): Promise<AdminOrder> {
      if (status === 'PAID') {
        throw new AdminError('invalid-transition', 'Only a confirmed payment marks an order PAID');
      }
      if (status === 'ACCEPTED') {
        throw new AdminError('invalid-transition', 'Accepting requires a preparation time');
      }
      const current = store.orders.find(id);
      if (!current) throw new AdminError('not-found', 'Order not found');
      if (!canTransition(current.status, status)) {
        throw new AdminError(
          'invalid-transition',
          `Cannot change the order from ${current.status} to ${status}`,
        );
      }

      let refundNote: string | undefined;
      if (status === 'CANCELLED' && PAID_STATES.includes(current.status) && current.payment) {
        if (current.payment.provider !== 'stripe' || !gateway) {
          throw new AdminError('refund-unavailable', 'This payment cannot be refunded here');
        }
        const refund = await gateway.refund({
          intentId: current.payment.reference,
          idempotencyKey: `sushiriga:refund:${current.id}`,
        });
        store.payments.setStatus(current.payment.reference, 'refunded', now());
        refundNote = `refund ${refund.id} (${refund.status})`;
      }

      const fullNote = [note?.trim(), refundNote].filter(Boolean).join(' · ') || undefined;
      return change(id, (order, at) => transition(order, status, at, fullNote));
    },

    setPreparationTime(id: string, minutes: number): AdminOrder {
      if (!isPreparationTimeOption(minutes)) {
        throw new AdminError('invalid-preparation-time', 'Choose 10…80 minutes in 5-minute steps');
      }
      return change(id, (order, at) => {
        if (!['ACCEPTED', 'PREPARING', 'ALMOST_READY', 'DELAYED'].includes(order.status)) {
          throw new AdminError('invalid-transition', 'The order is not being prepared');
        }
        return { ...order, preparationTime: minutes, updatedAt: at };
      });
    },

    /** Today's numbers for the restaurant (local date of the first active location). */
    summary(date?: string): DaySummary {
      const timeZone = catalog.activeLocations()[0]?.timeZone ?? 'Europe/Riga';
      const day = date ?? localDate(now(), timeZone);
      const orders = store.orders
        .list({ limit: 5000 })
        .filter((o) => localDate(new Date(o.createdAt), timeZone) === day);
      const paid = orders.filter((o) => o.payment && o.status !== 'CANCELLED');
      return {
        date: day,
        paidOrders: paid.length,
        revenue: paid.reduce((sum, o) => sum + o.total, 0),
        tips: paid.reduce((sum, o) => sum + o.tip, 0),
        cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
      };
    },

    menu(): AdminProduct[] {
      const overrides = new Map(store.overrides.list().map((o) => [o.productId, o]));
      const current = new Map(catalog.catalog().products.map((p) => [p.id, p]));
      return catalog.baseProducts().map((base) => ({
        product: current.get(base.id) ?? base,
        basePrice: base.price,
        availableOverride: overrides.get(base.id)?.available ?? null,
        priceOverride: overrides.get(base.id)?.price ?? null,
      }));
    },

    setProduct(
      productId: string,
      change: { available?: boolean | null; price?: number | null },
    ): AdminProduct {
      if (!catalog.hasProduct(productId)) throw new AdminError('not-found', 'No such dish');
      const existing = store.overrides.list().find((o) => o.productId === productId);
      store.overrides.set(
        productId,
        {
          available:
            change.available !== undefined ? change.available : (existing?.available ?? null),
          price: change.price !== undefined ? change.price : (existing?.price ?? null),
        },
        now(),
      );
      return this.menu().find((item) => item.product.id === productId)!;
    },

    promoCodes: () => store.promo.list(),

    savePromoCode(input: Omit<PromoCode, 'usageCount'>): PromoCode {
      const code = normalizePromoCode(input.code);
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
        throw new AdminError('invalid-promo', 'Use 3–32 letters, digits, - or _');
      }
      if (input.type === 'percentage' && (input.value < 1 || input.value > 100)) {
        throw new AdminError('invalid-promo', 'A percentage must be 1–100');
      }
      if (input.type === 'fixed' && input.value < 1) {
        throw new AdminError('invalid-promo', 'A fixed discount must be positive');
      }
      if (input.visibility === 'personal' && !input.customerId) {
        throw new AdminError('invalid-promo', 'Personal codes need a customer (accounts later)');
      }
      const existing = store.promo.find(code);
      const promo: PromoCode = { ...input, code, usageCount: existing?.usageCount ?? 0 };
      store.promo.upsert(promo, now());
      return store.promo.find(code)!;
    },

    reviews(status: ReviewModeration | null): AdminReview[] {
      return store.reviews.list(status);
    },

    moderateReview(id: string, status: ReviewModeration): AdminReview {
      if (!store.reviews.setStatus(id, status)) throw new AdminError('not-found', 'No such review');
      return store.reviews.find(id)!;
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
