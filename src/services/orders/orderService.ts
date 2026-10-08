import type { Customer, Order, OrderItem, OrderStatus, PreparationTimeOption } from '@/types';

export interface CreateOrderInput {
  customer: Customer;
  items: OrderItem[];
  promoCode?: string;
  /** Discount the customer saw. The backend recalculates it and may reject a mismatch. */
  expectedDiscount: number;
  tip: number;
  locationId: string;
  pickupTime: string;
  /** Reference from the payment provider. */
  paymentId: string;
}

/**
 * Customer-facing order API. In production the backend recalculates every amount
 * (prices, promo discount, total) — values sent from the browser are never trusted.
 */
export interface OrderService {
  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  listCustomerOrders(customerId: string): Promise<Order[]>;
}

/** Staff / admin API (future admin panel). Kept separate so checkout never depends on it. */
export interface OrderAdminService {
  listOrders(filter?: { locationId?: string; status?: OrderStatus[] }): Promise<Order[]>;
  /** PAID → ACCEPTED. Staff MUST choose the final preparation time (10…80 min) here. */
  acceptOrder(id: string, preparationTime: PreparationTimeOption): Promise<Order>;
  /** Any other allowed transition (PREPARING, DELAYED, READY, …). Not for ACCEPTED. */
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>;
  /** Change the time later, e.g. together with a delay. */
  setPreparationTime(id: string, minutes: PreparationTimeOption): Promise<Order>;
}
