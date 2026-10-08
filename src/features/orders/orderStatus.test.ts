import { ORDER_STATUSES } from '@/types';
import { canReview, canTransition, isFinalStatus, ORDER_TRANSITIONS } from './orderStatus';

describe('order status transitions', () => {
  it('covers every status', () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  it('follows the happy path', () => {
    expect(canTransition('PAID', 'ACCEPTED')).toBe(true);
    expect(canTransition('ACCEPTED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'ALMOST_READY')).toBe(true);
    expect(canTransition('ALMOST_READY', 'READY')).toBe(true);
    expect(canTransition('READY', 'PICKED_UP')).toBe(true);
  });

  it('allows delays and resuming, but not skipping backwards', () => {
    expect(canTransition('PREPARING', 'DELAYED')).toBe(true);
    expect(canTransition('DELAYED', 'PREPARING')).toBe(true);
    expect(canTransition('READY', 'PREPARING')).toBe(false);
    expect(canTransition('PICKED_UP', 'CANCELLED')).toBe(false);
  });

  it('only allows reviews after pickup', () => {
    expect(canReview('READY')).toBe(false);
    expect(canReview('PICKED_UP')).toBe(true);
    expect(isFinalStatus('CANCELLED')).toBe(true);
  });
});
