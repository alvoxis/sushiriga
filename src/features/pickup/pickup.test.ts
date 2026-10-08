import type { Location } from '@/types';
import { PREPARATION_TIME_OPTIONS } from '@/types';
import { canOrderAsap, isOpenAt, pickupSlots } from './pickupSlots';
import {
  estimatePreparationTime,
  isPreparationTimeOption,
  MIN_PREPARATION_MINUTES,
} from './preparationTime';

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
  it('is never below 30 minutes', () => {
    expect(MIN_PREPARATION_MINUTES).toBe(30);
    expect(estimatePreparationTime([{ productId: 'a', quantity: 1 }])).toBe(30);
  });

  it('applies large-order rules when configured', () => {
    const policy = {
      minimumMinutes: 30,
      largeOrderRules: [{ minItems: 10, minutes: 45 as const }],
    };
    expect(estimatePreparationTime([{ productId: 'a', quantity: 9 }], policy)).toBe(30);
    expect(estimatePreparationTime([{ productId: 'a', quantity: 10 }], policy)).toBe(45);
  });

  it('offers staff choices from 10 to 80 minutes in 5-minute steps', () => {
    expect(PREPARATION_TIME_OPTIONS[0]).toBe(10);
    expect(PREPARATION_TIME_OPTIONS.at(-1)).toBe(80);
    expect(PREPARATION_TIME_OPTIONS).toHaveLength(15);
    expect(isPreparationTimeOption(35)).toBe(true);
    expect(isPreparationTimeOption(33)).toBe(false);
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

  it('has no slots on a closed day and no ASAP after closing', () => {
    expect(pickupSlots(location, new Date('2026-10-06T12:00:00+03:00'), 30)).toEqual([]);
    expect(canOrderAsap(location, at('21:45'), 30)).toBe(false);
    expect(canOrderAsap(location, at('12:00'), 30)).toBe(true);
  });
});
