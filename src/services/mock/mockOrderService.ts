import { priceCheckout } from '@/features/checkout/priceCheckout';
import { canTransition } from '@/features/orders/orderStatus';
import { isPreparationTimeOption } from '@/features/pickup/preparationTime';
import type {
  CheckoutQuote,
  CheckoutRequest,
  Location,
  Order,
  OrderStatus,
  Product,
  PromoCode,
} from '@/types';
import { createId } from '@/utils/id';
import { readStorage, writeStorage } from '@/utils/storage';
import { OrderError, type OrderAdminService, type OrderService } from '../orders/orderService';
import type { PaymentResult } from '../payments/paymentService';
import { mockDelay } from './delay';
import { MOCK_PROMO_CODES } from './fixtures';

const KEY = 'mock.orders.v2';

interface MockOrderDeps {
  products: Product[];
  locations: Location[];
  promoCodes?: PromoCode[];
  now?: () => Date;
}

function load(): Order[] {
  return readStorage<Order[]>(KEY, []);
}

function save(orders: Order[]): void {
  writeStorage(KEY, orders);
}

function update(id: string, change: (order: Order) => Order): Order {
  const orders = load();
  const index = orders.findIndex((o) => o.id === id);
  const current = orders[index];
  if (!current) throw new Error(`Order ${id} not found`);
  const next = change(current);
  orders[index] = next;
  save(orders);
  return next;
}

/**
 * DEMO order backend running in the browser. It imitates the server's trust model: it prices
 * the cart itself (catalog prices, promo rules, tip limits); `placeOrder` creates an UNPAID order
 * (PENDING_PAYMENT) and only a confirmed payment of exactly the quoted amount marks it PAID.
 * Orders live in this browser only and NEVER reach the restaurant.
 */
export interface MockOrderBackend extends OrderService, OrderAdminService {
  /**
   * What a payment webhook does on the real server. NOT reachable from the demo UI (demo orders
   * are never paid) — it exists so the tests can cover the PAID rules and staff actions.
   */
  awaitPaidOrder(quoteId: string, payment: PaymentResult): Promise<Order>;
}

export function createMockOrderService(deps: MockOrderDeps): MockOrderBackend {
  const promoCodes = deps.promoCodes ?? MOCK_PROMO_CODES;
  const now = deps.now ?? (() => new Date());
  const quotes = new Map<string, { quote: CheckoutQuote; request: CheckoutRequest }>();
  const ordersByQuote = new Map<string, string>();

  function price(request: CheckoutRequest): CheckoutQuote {
    const priced = priceCheckout(request, {
      products: deps.products,
      locations: deps.locations,
      findPromo: (code) => promoCodes.find((p) => p.code === code),
      now: now(),
    });
    return { quoteId: createId('quote'), ...priced };
  }

  function createOrder(
    { quote, request }: { quote: CheckoutQuote; request: CheckoutRequest },
    status: 'PENDING_PAYMENT' | 'PAID',
    payment: Order['payment'],
  ): Order {
    const at = now().toISOString();
    const order: Order = {
      id: createId('SR').toUpperCase(),
      customer: request.customer,
      items: quote.items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      tip: quote.tip,
      total: quote.total,
      ...(quote.promoCode ? { promoCode: quote.promoCode } : {}),
      location: request.locationId,
      pickupTime: request.pickupTime,
      preparationTime: null, // chosen by staff in acceptOrder
      status,
      statusHistory: [{ status, at }],
      payment,
      createdAt: at,
      updatedAt: at,
    };
    save([order, ...load()]);
    return order;
  }

  return {
    async quote(request) {
      await mockDelay();
      const quote = price(request);
      quotes.set(quote.quoteId, { quote, request });
      return quote;
    },

    async placeOrder(quoteId) {
      await mockDelay();
      const existing = ordersByQuote.get(quoteId);
      if (existing) {
        const order = load().find((o) => o.id === existing);
        if (order) return order; // idempotent: one quote → one order
      }
      const entry = quotes.get(quoteId);
      if (!entry) throw new OrderError('quote-not-found', `Quote ${quoteId} not found`);
      const order = createOrder(entry, 'PENDING_PAYMENT', null);
      ordersByQuote.set(quoteId, order.id);
      return order;
    },

    async awaitPaidOrder(quoteId, payment) {
      await mockDelay();
      const entry = quotes.get(quoteId);
      const existingId = ordersByQuote.get(quoteId);
      const existing = existingId ? load().find((o) => o.id === existingId) : undefined;
      if (existing?.status === 'PAID') return existing;
      const total = existing?.total ?? entry?.quote.total;
      if (total === undefined)
        throw new OrderError('quote-not-found', `Quote ${quoteId} not found`);
      if (
        payment.status !== 'succeeded' ||
        payment.quoteId !== quoteId ||
        payment.amount !== total
      ) {
        throw new OrderError('payment-not-confirmed', 'Payment does not match the quote');
      }
      const paid = { provider: payment.provider, reference: payment.paymentId };
      if (existing) {
        const at = now().toISOString();
        return update(existing.id, (order) => ({
          ...order,
          status: 'PAID',
          payment: paid,
          statusHistory: [...order.statusHistory, { status: 'PAID', at }],
          updatedAt: at,
        }));
      }
      const order = createOrder(entry!, 'PAID', paid);
      ordersByQuote.set(quoteId, order.id);
      return order;
    },

    async getOrder(id) {
      return load().find((o) => o.id === id);
    },

    async listCustomerOrders(customerId) {
      return load().filter(
        (o) => o.customer.type === 'registered' && o.customer.customerId === customerId,
      );
    },

    async listOrders(filter) {
      return load().filter(
        (o) =>
          (!filter?.locationId || o.location === filter.locationId) &&
          (!filter?.status || filter.status.includes(o.status)),
      );
    },

    async acceptOrder(id, preparationTime) {
      if (!isPreparationTimeOption(preparationTime)) {
        throw new Error(`Invalid preparation time ${preparationTime}`);
      }
      return update(id, (order) => {
        if (order.status !== 'PAID') throw new Error(`Order ${id} is ${order.status}, not PAID`);
        const at = now().toISOString();
        return {
          ...order,
          status: 'ACCEPTED',
          preparationTime,
          statusHistory: [...order.statusHistory, { status: 'ACCEPTED', at }],
          updatedAt: at,
        };
      });
    },

    async updateStatus(id, status: OrderStatus, note) {
      if (status === 'ACCEPTED') {
        throw new Error('Use acceptOrder(): accepting requires a preparation time');
      }
      if (status === 'PAID') {
        throw new Error(
          'Cannot change an order to PAID manually: only a confirmed payment does that',
        );
      }
      return update(id, (order) => {
        if (!canTransition(order.status, status)) {
          throw new Error(`Cannot change order ${id} from ${order.status} to ${status}`);
        }
        const at = now().toISOString();
        return {
          ...order,
          status,
          statusHistory: [...order.statusHistory, { status, at, ...(note ? { note } : {}) }],
          updatedAt: at,
        };
      });
    },

    async setPreparationTime(id, minutes) {
      if (!isPreparationTimeOption(minutes)) throw new Error(`Invalid preparation time ${minutes}`);
      return update(id, (order) => ({
        ...order,
        preparationTime: minutes,
        updatedAt: now().toISOString(),
      }));
    },
  };
}
