import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@/types';
import { formatMoney } from '@/utils/money';
import { writeStorage } from '@/utils/storage';
import { detectLocale, LOCALE_STORAGE_KEY } from './detectLocale';
import { I18nContext, type I18nContextValue } from './I18nContext';
import { translate } from './translate';
import { translations } from './translations';

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStorage(LOCALE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const messages = translations[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => translate(messages, key, params),
      formatPrice: (cents) => formatMoney(cents, locale),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
