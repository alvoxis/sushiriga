import type { Location } from '@/types';

/**
 * Pickup locations. The architecture supports many; only Location 1 exists for now.
 * Location 2 will be added here later — it is intentionally NOT in the UI yet.
 */
export const locations: Location[] = [
  {
    id: 'location-1',
    name: 'SUSHIRIGA',
    // Confirmed by the owner (2026-10).
    address: {
      street: 'Latgales iela 250A',
      city: 'Rīga',
      postalCode: 'LV-1063',
      country: 'LV',
    },
    // Restaurant opening hours, confirmed by the owner (= sushiriga.lv home page).
    // NOTE: "served daily 12PM – 10PM" on the source menu page is menu / online-ordering
    // information, NOT the restaurant opening hours, and is deliberately not used here.
    openingHours: {
      0: [{ opens: '11:00', closes: '22:00' }], // Sunday
      1: [{ opens: '11:00', closes: '22:00' }],
      2: [{ opens: '11:00', closes: '22:00' }],
      3: [{ opens: '11:00', closes: '22:00' }],
      4: [{ opens: '11:00', closes: '22:00' }],
      5: [{ opens: '11:00', closes: '23:30' }], // Friday
      6: [{ opens: '11:00', closes: '23:30' }], // Saturday
    },
    // TODO(owner): phone and e-mail are not confirmed yet. They are optional and configurable;
    // the UI shows them automatically once they are set here (or delivered by the backend).
    phone: undefined,
    email: undefined,
    active: true,
    timeZone: 'Europe/Riga',
    todo: ['Confirm the pickup phone number.', 'Confirm the contact e-mail.'],
  },
];
