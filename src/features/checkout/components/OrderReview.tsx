import type { RefObject } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { findProduct, productName } from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { CheckoutQuote, GuestContact, Location } from '@/types';
import styles from './checkout.module.css';

interface OrderReviewProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Server-calculated amounts — the review never shows browser-side totals. */
  quote: CheckoutQuote;
  location: Location;
  pickupLabel: string;
  contact: GuestContact;
  busy: boolean;
  failure: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}

/** Last look before the order is created: dishes, money, pickup and contact. */
export function OrderReview({
  headingRef,
  quote,
  location,
  pickupLabel,
  contact,
  busy,
  failure,
  onEdit,
  onConfirm,
}: OrderReviewProps) {
  const { t, locale, formatPrice } = useTranslation();
  const catalog = useCatalog();
  const { promo } = useServices();
  const { street, city, postalCode } = location.address;

  return (
    <section className={styles.review} aria-labelledby="review-title" data-testid="order-review">
      <h2 id="review-title" ref={headingRef} tabIndex={-1} className={styles.reviewTitle}>
        {t('checkout.reviewTitle')}
      </h2>

      <Card className={styles.reviewCard}>
        <h3 className={styles.reviewHeading}>{t('order.items')}</h3>
        <ul className={styles.reviewItems}>
          {quote.items.map((item, index) => {
            const product = findProduct(catalog, item.productId);
            return (
              <li key={`${item.productId}-${index}`}>
                <span className={styles.reviewItemName}>
                  <span className={styles.qty}>{item.quantity} ×</span>{' '}
                  {product ? productName(product, locale) : item.name}
                  <span className={styles.unit}>{formatPrice(item.unitPrice)}</span>
                </span>
                <span className={styles.amount}>{formatPrice(item.lineTotal)}</span>
              </li>
            );
          })}
        </ul>
        <dl className={styles.reviewTotals}>
          <div>
            <dt>{t('cart.subtotal')}</dt>
            <dd>{formatPrice(quote.subtotal)}</dd>
          </div>
          {quote.promoCode && (
            <div>
              <dt>
                {promo.mode === 'mock' ? t('cart.discountMock') : t('cart.discount')} (
                {quote.promoCode})
              </dt>
              <dd>−{formatPrice(quote.discount)}</dd>
            </div>
          )}
          {quote.tip > 0 && (
            <div>
              <dt>{t('checkout.tip')}</dt>
              <dd>{formatPrice(quote.tip)}</dd>
            </div>
          )}
          <div className={styles.reviewTotal}>
            <dt>{t('cart.total')}</dt>
            <dd data-testid="review-total">{formatPrice(quote.total)}</dd>
          </div>
        </dl>
      </Card>

      <div className={styles.reviewGrid}>
        <Card className={styles.reviewCard}>
          <h3 className={styles.reviewHeading}>{t('checkout.steps.pickup')}</h3>
          <p>
            <strong>{location.name}</strong>
            <br />
            {street}, {city} {postalCode}
          </p>
          <p className={styles.reviewTime}>
            {pickupLabel} <Badge tone="outline">{t('checkout.timePreliminary')}</Badge>
          </p>
          <p className={styles.note}>{t('checkout.timeNote')}</p>
        </Card>
        <Card className={styles.reviewCard}>
          <h3 className={styles.reviewHeading}>{t('checkout.steps.contact')}</h3>
          <dl className={styles.reviewContact}>
            <dt>{t('checkout.name')}</dt>
            <dd>{contact.name}</dd>
            <dt>{t('checkout.phone')}</dt>
            <dd>{contact.phone}</dd>
            {contact.email && (
              <>
                <dt>{t('checkout.email')}</dt>
                <dd>{contact.email}</dd>
              </>
            )}
          </dl>
        </Card>
      </div>

      <div className={styles.payment} role="note">
        <p>
          <strong>{t('common.demoMode')}.</strong> {t('checkout.confirmNote')}
        </p>
      </div>
      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
      <div className={styles.reviewActions}>
        <Button variant="secondary" size="lg" onClick={onEdit} disabled={busy}>
          {t('checkout.edit')}
        </Button>
        <Button size="lg" onClick={onConfirm} disabled={busy}>
          {busy ? t('checkout.confirming') : t('checkout.confirm')}
        </Button>
      </div>
    </section>
  );
}
