import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import {
  BottomNav,
  DemoBanner,
  Footer,
  Header,
  MAIN_CONTENT_ID,
  SkipLink,
} from '@/components/layout';
import { useTranslation } from '@/i18n';
import styles from './RootLayout.module.css';

export function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className={styles.loading} role="status">
      {t('common.loading')}
    </div>
  );
}

export function RootLayout() {
  const location = useLocation();
  return (
    <div className={styles.shell}>
      <SkipLink />
      <DemoBanner />
      <Header />
      <main id={MAIN_CONTENT_ID} className={styles.main} tabIndex={-1}>
        <Suspense fallback={<PageLoading />}>
          {/* Keyed by path → a short enter transition on every page change. */}
          <div key={location.pathname} className={styles.page}>
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      <ScrollRestoration />
    </div>
  );
}
