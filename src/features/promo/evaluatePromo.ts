import type { Cents, PromoCode, PromoValidationResult } from '@/types';

export interface PromoContext {
  subtotal: Cents;
  now: Date;
  customerId?: string;
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Pure promo rules. The SAME rules must run on the backend, which is the source of truth for
 * the final discount; the frontend uses this only for mock mode and instant feedback.
 */
export function evaluatePromo(
  promo: PromoCode | undefined,
  input: string,
  ctx: PromoContext,
): PromoValidationResult {
  const code = normalizePromoCode(input);
  if (!promo) return { valid: false, code, reason: 'not-found' };
  if (!promo.active) return { valid: false, code, reason: 'inactive' };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= ctx.now.getTime()) {
    return { valid: false, code, reason: 'expired' };
  }
  if (promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) {
    return { valid: false, code, reason: 'usage-limit-reached' };
  }
  if (promo.visibility === 'personal' && (!ctx.customerId || ctx.customerId !== promo.customerId)) {
    return { valid: false, code, reason: 'not-eligible' };
  }
  if (promo.minOrderValue !== undefined && ctx.subtotal < promo.minOrderValue) {
    return { valid: false, code, reason: 'min-order-not-met', minOrderValue: promo.minOrderValue };
  }
  const raw =
    promo.type === 'percentage'
      ? Math.round((ctx.subtotal * Math.min(Math.max(promo.value, 0), 100)) / 100)
      : Math.max(promo.value, 0);
  return { valid: true, code, discount: Math.min(raw, ctx.subtotal) };
}
