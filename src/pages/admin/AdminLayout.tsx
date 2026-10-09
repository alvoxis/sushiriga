import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { PageLoading } from '@/app/layouts/RootLayout';
import { ADMIN_ROUTES, ROUTES } from '@/app/routes';
import { LanguageSwitcher, Logo, MAIN_CONTENT_ID, SkipLink } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { AdminContext, type AdminSession } from '@/features/admin/AdminContext';
import { AdminLogin } from '@/features/admin/components/AdminLogin';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import { AdminError } from '@/services/admin/adminService';
import type { StaffUser } from '@/types';
import styles from './admin.module.css';

/** Search engines must never index the admin panel. */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/** The restaurant admin panel: its own layout (no customer navigation), staff sign-in first. */
export default function AdminLayout() {
  const { t } = useTranslation();
  const { admin, config } = useServices();
  const [user, setUser] = useState<StaffUser | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  useDocumentTitle(t('admin.title'));
  useNoIndex();

  useEffect(() => {
    if (!admin) return;
    let active = true;
    admin.me().then(
      (me) => active && setUser(me),
      () => active && setUser(null),
    );
    return () => {
      active = false;
    };
  }, [admin]);

  const describeError = useCallback(
    (error: unknown): string => {
      const code = error instanceof AdminError ? error.code : 'failed';
      if (code === 'unauthorized') {
        setNotice(t('admin.errors.session'));
        setUser(null);
        return t('admin.errors.session');
      }
      const messages: Partial<Record<typeof code, string>> = {
        forbidden: t('admin.errors.forbidden'),
        network: t('admin.errors.network'),
        'invalid-transition': t('admin.errors.transition'),
        'refund-unavailable': t('admin.errors.refund'),
        'payment-provider-error': t('admin.errors.provider'),
        'invalid-promo': t('admin.promo.invalid'),
      };
      return messages[code] ?? t('admin.errors.failed');
    },
    [t],
  );

  const session = useMemo<AdminSession | null>(
    () => (admin && user ? { admin, user, describeError } : null),
    [admin, user, describeError],
  );

  let content;
  if (!admin || config.demoMode) {
    content = (
      <Card as="section" className={styles.login}>
        <h1 className={styles.loginTitle}>{t('admin.title')}</h1>
        <p>{t('admin.demoOnly')}</p>
      </Card>
    );
  } else if (user === undefined) {
    content = <PageLoading />;
  } else if (!session) {
    content = (
      <AdminLogin
        admin={admin}
        notice={notice}
        onSignedIn={(signedIn) => {
          setNotice(null);
          setUser(signedIn);
        }}
      />
    );
  } else {
    content = (
      <AdminContext.Provider value={session}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </AdminContext.Provider>
    );
  }

  const sections = [
    { to: ADMIN_ROUTES.root, label: t('admin.nav.orders'), end: true },
    { to: ADMIN_ROUTES.menu, label: t('admin.nav.menu'), end: false },
    ...(session?.user.role === 'admin'
      ? [
          { to: ADMIN_ROUTES.promocodes, label: t('admin.nav.promo'), end: false },
          { to: ADMIN_ROUTES.reviews, label: t('admin.nav.reviews'), end: false },
        ]
      : []),
  ];

  return (
    <div className={styles.shell}>
      <SkipLink />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo />
          <span className={styles.badge}>{t('admin.title')}</span>
          <div className={styles.headerActions}>
            <LanguageSwitcher />
            {session && (
              <>
                <span className={styles.user}>
                  {t('admin.signedInAs', { name: session.user.name })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await session.admin.logout().catch(() => undefined);
                    setUser(null);
                  }}
                >
                  {t('admin.logout')}
                </Button>
              </>
            )}
            <Link to={ROUTES.home} className={styles.siteLink}>
              {t('admin.backToSite')}
            </Link>
          </div>
        </div>
        {session && (
          <nav className={styles.nav} aria-label={t('admin.nav.label')}>
            <ul role="list">
              {sections.map((section) => (
                <li key={section.to}>
                  <NavLink to={section.to} end={section.end} className={styles.navLink}>
                    {section.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id={MAIN_CONTENT_ID} className={styles.main} tabIndex={-1}>
        {content}
      </main>
    </div>
  );
}
