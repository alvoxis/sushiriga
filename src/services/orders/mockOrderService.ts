import { canTransition } from '@/features/orders/orderStatus';
import type { Order, OrderStatus } from '@/types';
import { createId } from '@/utils/id';
import { readStorage, writeStorage } from '@/utils/storage';
import { mockDelay } from '../delay';
import type { OrderAdminService, OrderService } from './orderService';

const KEY = 'mock.orders.v1';

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

/** Orders stored in localStorage of this browser only. DEMO — nothing reaches the restaurant. */
export function createMockOrderService(): OrderService & OrderAdminService {
  return {
    async createOrder(input) {
      await mockDelay();
      const now = new Date().toISOString();
      const subtotal = input.items.reduce((sum, i) => sum + i.lineTotal, 0);
      const discount = Math.min(Math.max(input.expectedDiscount, 0), subtotal);
      const order: Order = {
        id: createId('SR').toUpperCase(),
        customer: input.customer,
        items: input.items,
        subtotal,
        // The mock trusts the client; the real backend recalculates the discount.
        discount,
        tip: input.tip,
        total: subtotal - discount + input.tip,
        ...(input.promoCode ? { promoCode: input.promoCode } : {}),
        location: input.locationId,
        pickupTime: input.pickupTime,
        preparationTime: input.estimatedPreparationTime,
        status: 'PAID',
        statusHistory: [{ status: 'PAID', at: now }],
        createdAt: now,
        updatedAt: now,
      };
      save([order, ...load()]);
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
    async updateStatus(id, status: OrderStatus, note) {
      return update(id, (order) => {
        if (!canTransition(order.status, status)) {
          throw new Error(`Cannot change order ${id} from ${order.status} to ${status}`);
        }
        const at = new Date().toISOString();
        return {
          ...order,
          status,
          statusHistory: [...order.statusHistory, { status, at, ...(note ? { note } : {}) }],
          updatedAt: at,
        };
      });
    },
    async setPreparationTime(id, minutes) {
      return update(id, (order) => ({
        ...order,
        preparationTime: minutes,
        updatedAt: new Date().toISOString(),
      }));
    },
  };
}
