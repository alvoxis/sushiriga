import type { PreparationTimeOption } from '@/types';
import { PREPARATION_TIME_OPTIONS } from '@/types';

/**
 * Standard preparation time for a normal order. Used ONLY as the customer-facing estimate and as
 * the earliest pickup slot at checkout. There is deliberately no automatic "large order" rule:
 * the FINAL preparation time is chosen by restaurant staff after the paid order arrives
 * (see OrderAdminService.acceptOrder and PREPARATION_TIME_OPTIONS: 10…80 minutes).
 */
export const STANDARD_PREPARATION_MINUTES = 30;

export function isPreparationTimeOption(value: number): value is PreparationTimeOption {
  return (PREPARATION_TIME_OPTIONS as readonly number[]).includes(value);
}
