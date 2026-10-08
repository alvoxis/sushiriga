import { createContext, useContext } from 'react';
import type { Cents, Locale } from '@/types';
import type { MessageKey, MessageParams } from './translate';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
  formatPrice: (cents: Cents) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslation(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useTranslation must be used inside <I18nProvider>');
  return value;
}
