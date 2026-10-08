import type { Cents, TipSelection } from '@/types';
import { parseEuroInput } from '@/utils/money';

/** Sanity cap for a custom tip. TODO(owner): confirm the maximum. */
export const MAX_CUSTOM_TIP: Cents = 50_000;

export function tipAmount(selection: TipSelection): Cents {
  return selection.kind === 'none' ? 0 : selection.amount;
}

export function parseCustomTip(input: string): Cents | null {
  const cents = parseEuroInput(input);
  if (cents === null || cents <= 0 || cents > MAX_CUSTOM_TIP) return null;
  return cents;
}
