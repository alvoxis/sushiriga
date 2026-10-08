import type { PromoCode } from '@/types';
import { evaluatePromo } from './evaluatePromo';

const now = new Date('2026-10-08T12:00:00Z');
const base: PromoCode = {
  code: 'TEN',
  type: 'percentage',
  value: 10,
  usageCount: 0,
  active: true,
  visibility: 'public',
};

describe('evaluatePromo', () => {
  it('applies a percentage discount (rounded to cents)', () => {
    expect(evaluatePromo(base, ' ten ', { subtotal: 2555, now })).toEqual({
      valid: true,
      code: 'TEN',
      discount: 256,
    });
  });

  it('applies a fixed discount capped at the subtotal', () => {
    const fixed: PromoCode = { ...base, type: 'fixed', value: 500 };
    expect(evaluatePromo(fixed, 'TEN', { subtotal: 300, now })).toMatchObject({
      valid: true,
      discount: 300,
    });
  });

  it.each([
    ['not-found', undefined, {}],
    ['inactive', { ...base, active: false }, {}],
    ['expired', { ...base, expiresAt: '2026-10-01T00:00:00Z' }, {}],
    ['usage-limit-reached', { ...base, usageLimit: 3, usageCount: 3 }, {}],
    ['not-eligible', { ...base, visibility: 'personal', customerId: 'c1' }, { customerId: 'c2' }],
    ['min-order-not-met', { ...base, minOrderValue: 3000 }, {}],
  ] as const)('rejects: %s', (reason, promo, extra) => {
    const result = evaluatePromo(promo as PromoCode | undefined, 'TEN', {
      subtotal: 2000,
      now,
      ...extra,
    });
    expect(result).toMatchObject({ valid: false, reason });
  });

  it('public codes work without an account', () => {
    expect(evaluatePromo(base, 'TEN', { subtotal: 1000, now }).valid).toBe(true);
  });

  it('accepts a personal code for its owner', () => {
    const personal: PromoCode = { ...base, visibility: 'personal', customerId: 'c1' };
    expect(evaluatePromo(personal, 'TEN', { subtotal: 1000, now, customerId: 'c1' }).valid).toBe(
      true,
    );
  });
});
