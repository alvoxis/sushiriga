import { buildCart, MAX_QUANTITY } from '@/features/cart/cartMath';
import { canTransition } from '@/features/orders/orderStatus';
import { isPreparationTimeOption } from '@/features/pickup/preparationTime';
import { evaluatePromo, normalizePromoCode } from '@/features/promo/evaluatePromo';
import { MAX_CUSTOM_TIP } from '@/features/tips/tips';
import type {
  CheckoutQuote,
  CheckoutRequest,
  Location,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  PromoCode,
} from '@/types';
import { createId } from '@/utils/id';
import { readStorage, writeStorage } from '@/utils/storage';
import { OrderError, type OrderAdminService, type OrderService } from '../orders/orderService';
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
export function createMockOrderService(deps: MockOrderDeps): OrderService & OrderAdminService {
  const promoCodes = deps.promoCodes ?? MOCK_PROMO_CODES;
  const now = deps.now ?? (() => new Date());
  const quotes = new Map<string, { quote: CheckoutQuote; request: CheckoutRequest }>();
  const ordersByQuote = new Map<string, string>();

  function price(request: CheckoutRequest): CheckoutQuote {
    const { items, tip, locationId, pickupTime } = request;
    if (!items.length) throw new OrderError('invalid-request', 'Cart is empty');
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
        throw new OrderError('invalid-request', `Invalid quantity for ${item.productId}`);
      }
      const product = deps.products.find((p) => p.id === item.productId);
      if (!product?.available) {
        throw new OrderError('unavailable-product', `Product ${item.productId} is not available`);
      }
    }
    if (!Number.isInteger(tip) || tip < 0 || tip > MAX_CUSTOM_TIP) {
      throw new OrderError('invalid-request', 'Invalid tip');
    }
    if (!deps.locations.some((l) => l.id === locationId && l.active)) {
      throw new OrderError('invalid-request', 'Unknown pickup location');
    }
    if (pickupTime !== 'asap' && Number.isNaN(Date.parse(pickupTime))) {
      throw new OrderError('invalid-request', 'Invalid pickup time');
    }

    const cart = buildCart(items, deps.products);
    const lines: OrderItem[] = cart.items.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      ...(line.selectedOptions ? { selectedOptions: line.selectedOptions } : {}),
      name: deps.products.find((p) => p.id === line.productId)?.name ?? line.productId,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    }));

    let discount = 0;
    let promoCode: string | undefined;
    let promoRejected: CheckoutQuote['promoRejected'];
    if (request.promoCode) {
      const code = normalizePromoCode(request.promoCode);
      const customerId =
        request.customer.type === 'registered' ? request.customer.customerId : undefined;
      const result = evaluatePromo(
        promoCodes.find((p) => p.code === code),
        code,
        { subtotal: cart.subtotal, now: now(), ...(customerId ? { customerId } : {}) },
      );
      if (result.valid) {
        discount = result.discount;
        promoCode = result.code;
      } else {
        promoRejected = result.reason;
      }
    }

    return {
      quoteId: createId('quote'),
      items: lines,
      subtotal: cart.subtotal,
      discount,
      tip,
      total: cart.subtotal - discount + tip,
      ...(promoCode ? { promoCode } : {}),
      ...(promoRejected ? { promoRejected } : {}),
    };
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
