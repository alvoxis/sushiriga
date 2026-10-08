import { ROUTES } from '@/app/routes';

/** Sections of the (optional) customer account. There is intentionally no bonus/loyalty section. */
export const ACCOUNT_SECTIONS = [
  { key: 'profile' },
  { key: 'orders', to: ROUTES.accountOrders },
  { key: 'reviews', to: ROUTES.accountReviews },
  { key: 'promocodes', to: ROUTES.accountPromocodes },
  { key: 'tips', to: ROUTES.accountTips },
  { key: 'settings' },
] as const satisfies readonly { key: string; to?: string }[];

export type AccountSectionKey = (typeof ACCOUNT_SECTIONS)[number]['key'];
