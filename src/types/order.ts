import type { CartItem } from './cart';
import type { Customer } from './customer';
import type { Cents } from './money';
import type { PromoRejectionReason } from './promo';

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

/** How the order was paid. `demo` = simulated in demo mode: NO money was charged. */
export interface OrderPayment {
  provider: 'demo' | 'stripe';
  reference: string;
}

/**
 * What the browser sends to start a checkout. Deliberately contains NO prices, discounts or
 * totals: the server prices the cart from its own catalog and promo rules.
 */
export interface CheckoutRequest {
  customer: Customer;
  items: CartItem[];
  promoCode?: string;
  tip: Cents;
  locationId: string;
  /** "asap" or ISO date-time. */
  pickupTime: string;
}

/** The server-calculated price of a CheckoutRequest. The ONLY amounts a payment may use. */
export interface CheckoutQuote {
  quoteId: string;
  items: OrderItem[];
  subtotal: Cents;
  discount: Cents;
  tip: Cents;
  total: Cents;
  /** Applied promo code (normalized), if the server accepted it. */
  promoCode?: string;
  /** Set when a promo code was sent but rejected by the server. */
  promoRejected?: PromoRejectionReason;
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
  payment: OrderPayment;
  createdAt: string;
  updatedAt: string;
}
