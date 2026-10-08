import type { Cents, Locale } from '@/types';

const INTL_LOCALE: Record<Locale, string> = { lv: 'lv-LV', ru: 'ru-RU', en: 'en-IE' };
const formatters = new Map<Locale, Intl.NumberFormat>();

export function formatMoney(cents: Cents, locale: Locale): string {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'currency', currency: 'EUR' });
    formatters.set(locale, formatter);
  }
  return formatter.format(cents / 100);
}

/** Parses a user-typed euro amount ("5", "5,5", "5.50") into cents. Returns null if invalid. */
export function parseEuroInput(input: string): Cents | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
