import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/types';
import { readStorage } from '@/utils/storage';

export const LOCALE_STORAGE_KEY = 'locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Stored choice → browser languages → Latvian. */
export function detectLocale(): Locale {
  const stored = readStorage<unknown>(LOCALE_STORAGE_KEY, null);
  if (isLocale(stored)) return stored;
  const browser =
    typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const tag of browser) {
    const base = tag?.slice(0, 2).toLowerCase();
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
