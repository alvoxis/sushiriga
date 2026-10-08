export const LOCALES = ['lv', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'lv';

/** Text that may exist in some or all languages. Missing languages are simply absent. */
export type LocalizedText = Partial<Record<Locale, string>>;
