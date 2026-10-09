import type { Location } from '@/types';
import { PREPARATION_TIME_OPTIONS } from '@/types';
import {
  canOrderAsap,
  checkPickupTime,
  isOpenAt,
  pickupDays,
  pickupSlots,
  PREORDER_DAYS_AHEAD,
} from './pickupSlots';
import { isPreparationTimeOption, STANDARD_PREPARATION_MINUTES } from './preparationTime';

const location: Location = {
  id: 'test',
  name: 'Test',
  address: { street: 'x', city: 'Rīga', country: 'LV' },
  openingHours: {
    0: [],
    1: [{ opens: '11:00', closes: '22:00' }],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  },
  active: true,
  timeZone: 'Europe/Riga',
};

// 2026-10-05 is a Monday. Riga is UTC+3 in October (EEST).
const at = (localTime: string) => new Date(`2026-10-05T${localTime}:00+03:00`);

describe('preparation time', () => {
  it('uses 30 minutes as the standard estimate', () => {
    expect(STANDARD_PREPARATION_MINUTES).toBe(30);
  });

  it('offers staff choices from 10 to 80 minutes in 5-minute steps', () => {
    expect([...PREPARATION_TIME_OPTIONS]).toEqual([
      10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
    ]);
    expect(isPreparationTimeOption(35)).toBe(true);
    expect(isPreparationTimeOption(33)).toBe(false);
    expect(isPreparationTimeOption(90)).toBe(false);
  });
});

describe('pickup slots', () => {
  it('knows opening hours in the restaurant time zone', () => {
    expect(isOpenAt(location, at('10:59'))).toBe(false);
    expect(isOpenAt(location, at('11:00'))).toBe(true);
    expect(isOpenAt(location, at('22:00'))).toBe(false);
  });

  it('starts slots after the preparation time and ends at closing', () => {
    const slots = pickupSlots(location, at('20:50'), 30);
    const fmt = (d: Date) => d.toISOString().slice(11, 16);
    expect(slots.map(fmt)).toEqual(['18:30', '18:45', '19:00']); // 21:30, 21:45, 22:00 local
  });

  it('before opening, the first slot is opening time + preparation time', () => {
    const fmt = (d: Date) => d.toISOString().slice(11, 16);
    expect(fmt(pickupSlots(location, at('09:00'), 30)[0]!)).toBe('08:30'); // 11:30 local
  });

  it('has no slots on a closed day and no ASAP after closing', () => {
    expect(pickupSlots(location, new Date('2026-10-06T12:00:00+03:00'), 30)).toEqual([]);
    expect(canOrderAsap(location, at('21:45'), 30)).toBe(false);
    expect(canOrderAsap(location, at('12:00'), 30)).toBe(true);
  });
});

describe('checking the chosen pickup time at submit', () => {
  const now = at('12:00');

  it('accepts an offered slot and "asap" while possible', () => {
    expect(checkPickupTime(location, now, 30, at('12:30').toISOString())).toBeNull();
    expect(checkPickupTime(location, now, 30, 'asap')).toBeNull();
  });

  it.each([
    ['missing', ''],
    ['invalid', 'soon'],
    ['past', at('11:00').toISOString()],
    ['unavailable', at('12:15').toISOString()], // closer than 30 minutes
    ['unavailable', at('22:15').toISOString()], // after closing
    ['unavailable', at('12:40').toISOString()], // not on the slot grid
    ['unavailable', new Date('2026-10-06T12:30:00+03:00').toISOString()], // tomorrow: pre-orders are off
  ] as const)('reports %s', (problem, value) => {
    expect(checkPickupTime(location, now, 30, value)).toBe(problem);
  });

  it('"asap" becomes unavailable near closing', () => {
    expect(checkPickupTime(location, at('21:45'), 30, 'asap')).toBe('unavailable');
  });
});

describe('pre-orders (architecture ready, feature off)', () => {
  const everyDay: Location = {
    ...location,
    openingHours: {
      0: [{ opens: '11:00', closes: '22:00' }],
      1: [{ opens: '11:00', closes: '22:00' }],
      2: [{ opens: '11:00', closes: '22:00' }],
      3: [],
      4: [],
      5: [],
      6: [],
    },
  };

  it('is switched off: only today is offered', () => {
    expect(PREORDER_DAYS_AHEAD).toBe(0);
    expect(pickupDays(everyDay, at('12:00'), 30).map((d) => d.date)).toEqual(['2026-10-05']);
  });

  it('can return following days once enabled (opening + preparation time on those days)', () => {
    const days = pickupDays(everyDay, at('21:40'), 30, 1);
    expect(days.map((d) => d.date)).toEqual(['2026-10-06']); // today is too late, tomorrow is open
    expect(days[0]!.slots[0]!.toISOString()).toBe('2026-10-06T08:30:00.000Z'); // 11:30 local
  });
});
