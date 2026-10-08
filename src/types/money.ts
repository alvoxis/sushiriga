/**
 * Money is always stored as an integer number of euro CENTS to avoid floating point errors.
 * €9.50 → 950. Formatting happens only at the UI edge (see utils/money.ts).
 */
export type Cents = number;
export const CURRENCY = 'EUR';
