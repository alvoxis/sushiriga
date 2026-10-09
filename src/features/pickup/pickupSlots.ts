import type { Location, OpeningInterval, Weekday } from '@/types';
import { addMinutes, ceilToStep, parseClock, zonedParts } from '@/utils/time';

export const SLOT_STEP_MINUTES = 15;

/**
 * How many days AFTER today customers may pre-order for. 0 = today only (current product
 * decision). Raising it makes `pickupDays` return further days — checkout then needs a day
 * picker; nothing else changes. TODO(product): enable once pre-orders are accepted.
 */
export const PREORDER_DAYS_AHEAD = 0;

export interface PickupDay {
  /** Restaurant-local date, YYYY-MM-DD. */
  date: string;
  slots: Date[];
}

function intervalsFor(location: Location, weekday: number): OpeningInterval[] {
  return location.openingHours[weekday as Weekday] ?? [];
}

/** Restaurant-local calendar date of `date` (YYYY-MM-DD). */
export function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Whether the restaurant is open at `date` (restaurant local time). */
export function isOpenAt(location: Location, date: Date): boolean {
  const { weekday, minutes } = zonedParts(date, location.timeZone);
  return intervalsFor(location, weekday).some(
    (i) => minutes >= parseClock(i.opens) && minutes < parseClock(i.closes),
  );
}

/**
 * A pickup moment is possible when the food can be ready: at least `preparationMinutes` after
 * `now`, at least `preparationMinutes` after opening, and not later than closing time.
 */
export function isPickupPossible(
  location: Location,
  now: Date,
  preparationMinutes: number,
  time: Date,
): boolean {
  if (time.getTime() < addMinutes(now, preparationMinutes).getTime()) return false;
  const { weekday, minutes } = zonedParts(time, location.timeZone);
  return intervalsFor(location, weekday).some(
    (i) => minutes >= parseClock(i.opens) + preparationMinutes && minutes <= parseClock(i.closes),
  );
}

/**
 * Pickup slots grouped by restaurant-local day: today plus `daysAhead` following days.
 * Days without any possible slot are omitted.
 */
export function pickupDays(
  location: Location,
  now: Date,
  preparationMinutes: number,
  daysAhead = PREORDER_DAYS_AHEAD,
  step = SLOT_STEP_MINUTES,
): PickupDay[] {
  const earliest = ceilToStep(addMinutes(now, preparationMinutes), step);
  const allowedDates = new Set<string>();
  for (let d = 0; d <= daysAhead; d++)
    allowedDates.add(localDate(addMinutes(now, d * 24 * 60), location.timeZone));
  const end = addMinutes(now, (daysAhead + 1) * 24 * 60 + 60);

  const days = new Map<string, Date[]>();
  for (let t = earliest; t < end; t = addMinutes(t, step)) {
    const date = localDate(t, location.timeZone);
    if (!allowedDates.has(date)) continue;
    if (!isPickupPossible(location, now, preparationMinutes, t)) continue;
    days.set(date, [...(days.get(date) ?? []), t]);
  }
  return [...days].map(([date, slots]) => ({ date, slots }));
}

/** Today's pickup slots (what checkout offers while pre-orders are off). */
export function pickupSlots(
  location: Location,
  now: Date,
  preparationMinutes: number,
  step = SLOT_STEP_MINUTES,
): Date[] {
  const today = localDate(now, location.timeZone);
  return (
    pickupDays(location, now, preparationMinutes, 0, step).find((d) => d.date === today)?.slots ??
    []
  );
}

/** "As soon as possible" is only offered while the restaurant is open and can finish in time. */
export function canOrderAsap(location: Location, now: Date, preparationMinutes: number): boolean {
  return (
    isOpenAt(location, now) &&
    isPickupPossible(location, now, preparationMinutes, addMinutes(now, preparationMinutes))
  );
}

export type PickupTimeProblem = 'missing' | 'invalid' | 'past' | 'unavailable';

/**
 * Re-checks the chosen pickup time at submit time — the form may have been open for a while.
 * Returns null when the choice is still valid.
 */
export function checkPickupTime(
  location: Location,
  now: Date,
  preparationMinutes: number,
  value: string,
): PickupTimeProblem | null {
  if (!value) return 'missing';
  if (value === 'asap')
    return canOrderAsap(location, now, preparationMinutes) ? null : 'unavailable';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return 'invalid';
  if (time.getTime() <= now.getTime()) return 'past';
  // Valid only if it is exactly one of the slots offered right now (same rules, same days).
  const offered = pickupDays(location, now, preparationMinutes).some((day) =>
    day.slots.some((slot) => slot.getTime() === time.getTime()),
  );
  return offered ? null : 'unavailable';
}
