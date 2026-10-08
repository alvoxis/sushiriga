/** "HH:mm" → minutes since midnight. */
export function parseClock(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Rounds up to the next multiple of `step` minutes. */
export function ceilToStep(date: Date, step: number): Date {
  const ms = step * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/**
 * Wall-clock parts of `date` in an IANA time zone (the restaurant is in Europe/Riga even
 * if the customer's device is not).
 */
export function zonedParts(date: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
