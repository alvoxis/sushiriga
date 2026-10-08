import { NavLink } from 'react-router';
import { ROUTES } from '@/app/routes';
import { ButtonLink, Icon } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { useTranslation } from '@/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import styles from './Header.module.css';

const LINKS = [
  { to: ROUTES.menu, key: 'nav.menu' },
  { to: ROUTES.pickup, key: 'nav.pickup' },
  { to: ROUTES.reviews, key: 'nav.reviews' },
  { to: ROUTES.assistant, key: 'nav.assistant' },
  { to: ROUTES.account, key: 'nav.account' },
] as const;

export function Header() {
  const { t } = useTranslation();
  const { itemCount } = useCart();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Logo />
        <nav className={styles.nav} aria-label={t('nav.mainNavigation')}>
          <ul className={styles.navList} role="list">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={styles.link}>
                  {t(link.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.actions}>
          <LanguageSwitcher />
          <ButtonLink
            to={ROUTES.cart}
            variant="ghost"
            iconOnly
            className={styles.cart}
            aria-label={t('nav.cartWithCount', { count: itemCount })}
          >
            <Icon name="bag" />
            {itemCount > 0 && (
              <span className={styles.count} aria-hidden="true">
                {itemCount}
              </span>
            )}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
