import { evaluatePromo, normalizePromoCode } from '@/features/promo/evaluatePromo';
import type { PromoCode } from '@/types';
import type { PromoService } from '../promo/promoService';
import { mockDelay } from './delay';
import { MOCK_PROMO_CODES } from './fixtures';

export function createMockPromoService(codes: PromoCode[] = MOCK_PROMO_CODES): PromoService {
  return {
    mode: 'mock',
    async validate(input, ctx) {
      await mockDelay();
      const code = normalizePromoCode(input);
      return evaluatePromo(
        codes.find((p) => p.code === code),
        code,
        { ...ctx, now: new Date() },
      );
    },
  };
}
