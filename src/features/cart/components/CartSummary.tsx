import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { Cart, Cents } from '@/types';
import { cn } from '@/utils/cn';
import styles from './cart.module.css';

export function CartSummary({ cart, tip = 0 }: { cart: Cart; tip?: Cents }) {
  const { t, formatPrice } = useTranslation();
  const { promo } = useServices();
  return (
    <dl className={styles.summary} data-testid="cart-summary">
      <div className={styles.row}>
        <dt>{t('cart.subtotal')}</dt>
        <dd data-testid="cart-subtotal">{formatPrice(cart.subtotal)}</dd>
      </div>
      {cart.discount > 0 && (
        <div className={cn(styles.row, styles.discount)}>
          <dt>
            {promo.mode === 'mock' ? t('cart.discountMock') : t('cart.discount')}{' '}
            {cart.promoCode && `(${cart.promoCode})`}
          </dt>
          <dd>−{formatPrice(cart.discount)}</dd>
        </div>
      )}
      {tip > 0 && (
        <div className={styles.row}>
          <dt>{t('checkout.tip')}</dt>
          <dd>{formatPrice(tip)}</dd>
        </div>
      )}
      <div className={cn(styles.row, styles.totalRow)}>
        <dt>{t('cart.total')}</dt>
        <dd data-testid="cart-total">{formatPrice(cart.total + tip)}</dd>
      </div>
    </dl>
  );
}
