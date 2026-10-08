import type { OrderStatus } from '@/types';

/**
 * Allowed status transitions. The backend / admin panel enforces the same table.
 * DELAYED is a side-state: staff can delay an order and later resume it.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PAID: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'DELAYED', 'CANCELLED'],
  PREPARING: ['ALMOST_READY', 'READY', 'DELAYED', 'CANCELLED'],
  ALMOST_READY: ['READY', 'DELAYED'],
  READY: ['PICKED_UP'],
  DELAYED: ['PREPARING', 'ALMOST_READY', 'READY', 'CANCELLED'],
  PICKED_UP: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** The happy path shown as a progress timeline to the customer. */
export const ORDER_PROGRESS: readonly OrderStatus[] = [
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'ALMOST_READY',
  'READY',
  'PICKED_UP',
];

export function isFinalStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

/** Reviews can only be left after the order has been picked up. */
export function canReview(status: OrderStatus): boolean {
  return status === 'PICKED_UP';
}
