import type { Location, OpeningInterval, Weekday } from '@/types';
import { addMinutes, ceilToStep, parseClock, zonedParts } from '@/utils/time';

export const SLOT_STEP_MINUTES = 15;

function intervalsFor(location: Location, weekday: number): OpeningInterval[] {
  return location.openingHours[weekday as Weekday] ?? [];
}

/** Whether the restaurant is open at `date` (restaurant local time). */
export function isOpenAt(location: Location, date: Date): boolean {
  const { weekday, minutes } = zonedParts(date, location.timeZone);
  return intervalsFor(location, weekday).some(
    (i) => minutes >= parseClock(i.opens) && minutes < parseClock(i.closes),
  );
}

/**
 * Pickup times for "today" (restaurant local time) that respect the preparation time and the
 * opening hours. The last slot is at closing time at the latest.
 */
export function pickupSlots(
  location: Location,
  now: Date,
  preparationMinutes: number,
  step = SLOT_STEP_MINUTES,
): Date[] {
  const earliest = ceilToStep(addMinutes(now, preparationMinutes), step);
  const today = zonedParts(now, location.timeZone);
  const slots: Date[] = [];
  // Walk forward in steps until the restaurant-local day changes (max 24h).
  for (let t = earliest; t.getTime() - now.getTime() <= 24 * 60 * 60_000; t = addMinutes(t, step)) {
    const parts = zonedParts(t, location.timeZone);
    if (parts.weekday !== today.weekday) break;
    const fits = intervalsFor(location, parts.weekday).some(
      (i) => parts.minutes >= parseClock(i.opens) && parts.minutes <= parseClock(i.closes),
    );
    if (fits) slots.push(t);
  }
  return slots;
}

/** "As soon as possible" is only offered while the order can be ready before closing. */
export function canOrderAsap(location: Location, now: Date, preparationMinutes: number): boolean {
  if (!isOpenAt(location, now)) return false;
  const ready = addMinutes(now, preparationMinutes);
  const { weekday, minutes } = zonedParts(ready, location.timeZone);
  return intervalsFor(location, weekday).some(
    (i) => minutes >= parseClock(i.opens) && minutes <= parseClock(i.closes),
  );
}
