import type { Cents, PromoValidationResult } from '@/types';

export interface PromoService {
  /**
   * `false` until a server can check codes. The UI then explains that promo codes are not
   * available yet instead of simulating a discount.
   */
  readonly available: boolean;
  /**
   * Validates a code for the current cart. The backend is the source of truth for the final
   * discount and re-validates when the order is created.
   */
  validate(
    code: string,
    ctx: { subtotal: Cents; customerId?: string },
  ): Promise<PromoValidationResult>;
}
