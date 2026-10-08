import type { Location } from '@/types';

/**
 * Pickup locations. The architecture supports many; only Location 1 exists for now.
 * Location 2 will be added here later (with `active: true` once it opens).
 */
export const locations: Location[] = [
  {
    id: 'location-1',
    name: 'SUSHIRIGA',
    // Address, phone, e-mail and hours as published on https://www.sushiriga.lv/ (2026-10-08).
    address: {
      street: 'Latgales iela 250A',
      city: 'Rīga',
      postalCode: 'LV-1063',
      country: 'LV',
    },
    openingHours: {
      0: [{ opens: '11:00', closes: '22:00' }],
      1: [{ opens: '11:00', closes: '22:00' }],
      2: [{ opens: '11:00', closes: '22:00' }],
      3: [{ opens: '11:00', closes: '22:00' }],
      4: [{ opens: '11:00', closes: '22:00' }],
      5: [{ opens: '11:00', closes: '23:30' }],
      6: [{ opens: '11:00', closes: '23:30' }],
    },
    phone: '+371 24 247 424',
    email: 'infosushiriga@gmail.com',
    active: true,
    timeZone: 'Europe/Riga',
    todo: [
      'Confirm the address with the owner (published on sushiriga.lv, not yet confirmed in project data).',
      'Opening hours conflict: home page says Mon–Thu & Sun 11:00–22:00, Fri–Sat 11:00–23:30; menu page says "served daily 12PM – 10PM". Confirm kitchen / pickup hours.',
      'Confirm the pickup phone number.',
    ],
  },
];
