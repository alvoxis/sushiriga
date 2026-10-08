import { parseCustomTip, tipAmount } from '@/features/tips/tips';
import { TIP_PRESETS } from '@/types';
import { validateReview } from './validateReview';

describe('reviews', () => {
  it('requires an explicit 1–5 rating (no default)', () => {
    expect(validateReview({ orderId: 'o' })).toContain('rating-required');
    expect(validateReview({ orderId: 'o', rating: 6 as never })).toContain('rating-required');
    expect(validateReview({ orderId: 'o', rating: 1 })).toEqual([]);
  });
});

describe('tips', () => {
  it('has the agreed presets', () => {
    expect(TIP_PRESETS).toEqual([100, 200, 300, 500, 1000, 1500, 2000]);
  });

  it('defaults to no tip and parses custom amounts', () => {
    expect(tipAmount({ kind: 'none' })).toBe(0);
    expect(parseCustomTip('4,50')).toBe(450);
    expect(parseCustomTip('0')).toBeNull();
    expect(parseCustomTip('abc')).toBeNull();
  });
});
