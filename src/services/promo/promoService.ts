import type { Cents, PromoValidationResult } from '@/types';

export type PromoMode = 'server' | 'mock' | 'unavailable';

export interface PromoService {
  /**
   * - `server`: codes are checked by the backend (production).
   * - `mock`: demo mode — only made-up test codes work; the UI labels the discount as a test
   *   discount and never presents it as server-checked.
   * - `unavailable`: no way to check codes; the field is disabled and says why.
   */
  readonly mode: PromoMode;
  /**
   * Validates a code for the current cart. The backend is the source of truth for the final
   * discount and re-validates when the order is created.
   */
  validate(
    code: string,
    ctx: { subtotal: Cents; customerId?: string },
  ): Promise<PromoValidationResult>;
}
