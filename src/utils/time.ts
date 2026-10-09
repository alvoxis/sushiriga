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

/** The instant a wall-clock time ("YYYY-MM-DD", "HH:mm:ss") happens in an IANA time zone. */
export function zonedTime(date: string, clock: string, timeZone: string): Date {
  const guess = new Date(`${date}T${clock}Z`);
  // How far the zone's wall clock is from UTC at that moment (handles summer/winter time).
  const offsetAt = (instant: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    const wall = Date.UTC(
      Number(get('year')),
      Number(get('month')) - 1,
      Number(get('day')),
      Number(get('hour')),
      Number(get('minute')),
      Number(get('second')),
    );
    return wall - instant.getTime();
  };
  const first = new Date(guess.getTime() - offsetAt(guess));
  return new Date(guess.getTime() - offsetAt(first));
}
