import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { CartProvider } from '@/features/cart/CartProvider';
import { CatalogProvider } from '@/features/menu/CatalogProvider';
import { I18nProvider } from '@/i18n';
import { createServices, ServicesContext, type Services } from '@/services';
import type { Locale } from '@/types';

interface AppProvidersProps {
  children: ReactNode;
  /** Injected in tests; created from env config otherwise. */
  services?: Services;
  initialLocale?: Locale;
}

export function AppProviders({ children, services: injected, initialLocale }: AppProvidersProps) {
  const [services] = useState(() => injected ?? createServices());
  return (
    <ServicesContext.Provider value={services}>
      <I18nProvider {...(initialLocale ? { initialLocale } : {})}>
        <ToastProvider>
          <CatalogProvider>
            <CartProvider>{children}</CartProvider>
          </CatalogProvider>
        </ToastProvider>
      </I18nProvider>
    </ServicesContext.Provider>
  );
}
