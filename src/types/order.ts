import type { CartItem } from './cart';
import type { Customer } from './customer';
import type { Cents } from './money';

export const ORDER_STATUSES = [
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'ALMOST_READY',
  'READY',
  'PICKED_UP',
  'DELAYED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Minutes a staff member can choose when accepting an order. */
export const PREPARATION_TIME_OPTIONS = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
] as const;
export type PreparationTimeOption = (typeof PREPARATION_TIME_OPTIONS)[number];

export interface OrderItem extends CartItem {
  /** Snapshot at the moment of ordering — catalog prices may change later. */
  name: string;
  unitPrice: Cents;
  lineTotal: Cents;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  customer: Customer;
  items: OrderItem[];
  subtotal: Cents;
  discount: Cents;
  tip: Cents;
  total: Cents;
  promoCode?: string;
  /** Location id. */
  location: string;
  /** ISO date-time or "asap" as requested by the customer. */
  pickupTime: string;
  /**
   * Final preparation time in minutes, chosen by staff from PREPARATION_TIME_OPTIONS when they
   * accept the paid order. `null` until then (the customer sees the standard estimate).
   */
  preparationTime: PreparationTimeOption | null;
  status: OrderStatus;
  statusHistory: OrderStatusChange[];
  createdAt: string;
  updatedAt: string;
}
