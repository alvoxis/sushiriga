import type { Locale, LocalizedText } from '@/types';
import { LOCALES } from '@/types';

/**
 * Returns text in the requested language, falling back to other languages that exist.
 * `isFallback` lets the UI mark text that is not in the user's language.
 */
export function pickLocalized(
  text: LocalizedText | undefined,
  locale: Locale,
): { text: string; locale: Locale; isFallback: boolean } | undefined {
  if (!text) return undefined;
  const direct = text[locale];
  if (direct) return { text: direct, locale, isFallback: false };
  for (const other of LOCALES) {
    const value = text[other];
    if (value) return { text: value, locale: other, isFallback: true };
  }
  return undefined;
}
