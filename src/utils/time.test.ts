import { zonedTime } from './time';

describe('zonedTime', () => {
  it('finds the instant of a Riga wall-clock time in summer and in winter', () => {
    expect(zonedTime('2026-10-05', '23:59:59', 'Europe/Riga').toISOString()).toBe(
      '2026-10-05T20:59:59.000Z', // UTC+3 (summer time)
    );
    expect(zonedTime('2026-12-24', '23:59:59', 'Europe/Riga').toISOString()).toBe(
      '2026-12-24T21:59:59.000Z', // UTC+2 (winter time)
    );
  });
});
