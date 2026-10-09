import { normalizePromoCode } from '@/features/promo/evaluatePromo';
import type { PromoService } from './promoService';

/**
 * Promo codes need a server-side check (usage limits, personal codes, final discount). Until the
 * backend exists, codes are not accepted at all — no simulated discounts in the real UI.
 */
export const unavailablePromoService: PromoService = {
  mode: 'unavailable',
  validate: async (code) => ({
    valid: false,
    code: normalizePromoCode(code),
    reason: 'unavailable',
  }),
};
