import type { PromoCode } from '@/types';

/**
 * MOCK FIXTURES ONLY — these are NOT real SUSHIRIGA promotions. They exist so the promo flow can
 * be exercised in demo mode and tests. Real codes will come from the backend / admin panel.
 */
export const MOCK_PROMO_CODES: PromoCode[] = [
  {
    code: 'DEMO10',
    type: 'percentage',
    value: 10,
    usageCount: 0,
    active: true,
    visibility: 'public',
  },
  {
    code: 'DEMO5',
    type: 'fixed',
    value: 500,
    minOrderValue: 3000,
    usageCount: 0,
    active: true,
    visibility: 'public',
  },
  {
    code: 'DEMOEXPIRED',
    type: 'percentage',
    value: 15,
    expiresAt: '2020-01-01T00:00:00Z',
    usageCount: 0,
    active: true,
    visibility: 'public',
  },
];
