import { useState } from 'react';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Card, Modal, PageHeader } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { CartLineItem } from '@/features/cart/components/CartLineItem';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { PromoCodeForm } from '@/features/cart/components/PromoCodeForm';
import cartStyles from '@/features/cart/components/cart.module.css';
import { findProduct } from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import styles from '../page.module.css';

export default function CartPage() {
  const { t } = useTranslation();
  const catalog = useCatalog();
  const { cart, clear } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  useDocumentTitle(t('cart.title'));

  if (!cart.items.length) {
    return (
      <div className="container">
        <PageHeader title={t('cart.title')} lead={t('cart.empty')} />
        <ButtonLink to={ROUTES.menu}>{t('cart.emptyCta')}</ButtonLink>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader title={t('cart.title')} />
      <div className={styles.twoColumns}>
        <section aria-label={t('cart.title')}>
          <ul className={cartStyles.lines} role="list">
            {cart.items.map((line) => {
              const product = findProduct(catalog, line.productId);
              return product ? <CartLineItem key={line.key} line={line} product={product} /> : null;
            })}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
            style={{ marginTop: 'var(--space-3)' }}
          >
            {t('cart.clear')}
          </Button>
        </section>
        <Card as="section" aria-label={t('cart.total')} className="stack">
          <PromoCodeForm />
          <CartSummary cart={cart} />
          <p className={cartStyles.note}>{t('cart.pricesNote')}</p>
          <ButtonLink to={ROUTES.checkout} size="lg" block>
            {t('cart.checkout')}
          </ButtonLink>
        </Card>
      </div>
      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('cart.clearConfirmTitle')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                clear();
                setConfirmClear(false);
              }}
            >
              {t('cart.clearConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('cart.clearConfirmBody')}</p>
      </Modal>
    </div>
  );
}
