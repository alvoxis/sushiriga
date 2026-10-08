import type { Cents, PromoValidationResult } from '@/types';

export interface PromoService {
  /**
   * Validates a code for the current cart. The backend is the source of truth for the final
   * discount and re-validates when the order is created.
   */
  validate(
    code: string,
    ctx: { subtotal: Cents; customerId?: string },
  ): Promise<PromoValidationResult>;
}
