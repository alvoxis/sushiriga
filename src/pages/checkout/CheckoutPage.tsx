import { useEffect, useState } from 'react';
import { ROUTES } from '@/app/routes';
import { ButtonLink, PageHeader } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { CheckoutForm } from '@/features/checkout/components/CheckoutForm';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { Location } from '@/types';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { locations } = useServices();
  const { cart } = useCart();
  const [active, setActive] = useState<Location[] | null>(null);
  useDocumentTitle(t('checkout.title'));

  useEffect(() => {
    let current = true;
    locations.listActive().then((list) => current && setActive(list));
    return () => {
      current = false;
    };
  }, [locations]);

  return (
    <div className="container">
      <PageHeader title={t('checkout.title')} />
      {!cart.items.length ? (
        <>
          <p>{t('checkout.emptyCart')}</p>
          <ButtonLink to={ROUTES.menu} style={{ marginTop: 'var(--space-4)' }}>
            {t('cart.emptyCta')}
          </ButtonLink>
        </>
      ) : active ? (
        <CheckoutForm locations={active} />
      ) : (
        <p role="status">{t('common.loading')}</p>
      )}
    </div>
  );
}
