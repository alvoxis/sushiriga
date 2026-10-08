import { NavLink } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Icon, type IconName } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { useTranslation, type MessageKey } from '@/i18n';
import styles from './BottomNav.module.css';

const ITEMS: { to: string; key: MessageKey; icon: IconName; end?: boolean }[] = [
  { to: ROUTES.home, key: 'nav.home', icon: 'home', end: true },
  { to: ROUTES.menu, key: 'nav.menu', icon: 'book' },
  { to: ROUTES.assistant, key: 'nav.assistant', icon: 'cat' },
  { to: ROUTES.cart, key: 'nav.cart', icon: 'bag' },
  { to: ROUTES.account, key: 'nav.account', icon: 'user' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { itemCount } = useCart();
  return (
    <nav className={styles.nav} aria-label={t('nav.bottomNavigation')}>
      <ul className={styles.list} role="list">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={styles.link}
              aria-label={
                item.icon === 'bag' ? t('nav.cartWithCount', { count: itemCount }) : undefined
              }
            >
              <Icon name={item.icon} />
              <span aria-hidden={item.icon === 'bag' ? true : undefined}>{t(item.key)}</span>
              {item.icon === 'bag' && itemCount > 0 && (
                <span className={styles.badge} aria-hidden="true" data-testid="bottom-cart-count">
                  {itemCount}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
