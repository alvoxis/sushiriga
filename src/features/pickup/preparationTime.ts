import type { CartItem, PreparationTimeOption } from '@/types';
import { PREPARATION_TIME_OPTIONS } from '@/types';

/** Business rule: an order is never promised faster than this. */
export const MIN_PREPARATION_MINUTES = 30;

export interface LargeOrderRule {
  /** Applies when the total quantity of items is at least this. */
  minItems: number;
  minutes: PreparationTimeOption;
}

export interface PreparationPolicy {
  minimumMinutes: number;
  /**
   * TODO(owner): the restaurant has not defined when an order counts as "large" yet.
   * Add rules here (e.g. { minItems: 10, minutes: 45 }) — checkout picks them up automatically.
   */
  largeOrderRules: LargeOrderRule[];
}

export const DEFAULT_PREPARATION_POLICY: PreparationPolicy = {
  minimumMinutes: MIN_PREPARATION_MINUTES,
  largeOrderRules: [],
};

/** Estimate shown at checkout. Staff confirm the real time when accepting the order. */
export function estimatePreparationTime(
  items: CartItem[],
  policy: PreparationPolicy = DEFAULT_PREPARATION_POLICY,
): number {
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const fromRules = policy.largeOrderRules
    .filter((rule) => count >= rule.minItems)
    .reduce((max, rule) => Math.max(max, rule.minutes), 0);
  return Math.max(policy.minimumMinutes, fromRules);
}

export function isPreparationTimeOption(value: number): value is PreparationTimeOption {
  return (PREPARATION_TIME_OPTIONS as readonly number[]).includes(value);
}
