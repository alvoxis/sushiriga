import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Card, PageHeader, PlaceholderPanel } from '@/components/ui';
import { OrderStatusTimeline } from '@/features/orders/components/OrderStatusTimeline';
import { canReview, ORDER_PROGRESS } from '@/features/orders/orderStatus';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { useLocation } from '@/features/pickup/useLocations';
import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import type { Order } from '@/types';
import styles from '../page.module.css';

export default function OrderPage() {
  const { id = '' } = useParams();
  const { t, locale, formatPrice } = useTranslation();
  const { orders, ordersAdmin, config } = useServices();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const location = useLocation(order ? order.location : undefined);
  useDocumentTitle(t('order.title', { id }));

  const load = useCallback(
    () => orders.getOrder(id).then((found) => setOrder(found ?? null)),
    [orders, id],
  );
  useEffect(() => {
    void load();
  }, [load]);

  if (order === undefined)
    return (
      <p className="container" role="status">
        {t('common.loading')}
      </p>
    );
  if (order === null) {
    return (
      <div className="container">
        <PageHeader title={t('order.notFound')} />
        <ButtonLink to={ROUTES.menu}>{t('menu.backToMenu')}</ButtonLink>
      </div>
    );
  }

  const pickup =
    order.pickupTime === 'asap'
      ? t('order.asap')
      : new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: location?.timeZone,
        }).format(new Date(order.pickupTime));
  const nextDemoStatus = ORDER_PROGRESS[ORDER_PROGRESS.indexOf(order.status) + 1];

  return (
    <div className="container">
      <PageHeader eyebrow={t('order.thanks')} title={t('order.title', { id: order.id })} />
      <div className={styles.twoColumns}>
        <div className="stack">
          {order.payment.provider === 'demo' && (
            <p className={styles.demoNotice} role="note">
              {t('order.demoNotice')}
            </p>
          )}
          <Card>
            <OrderStatusTimeline status={order.status} />
          </Card>
          {config.demoMode && ordersAdmin && nextDemoStatus && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  // Demo stand-in for staff: accepting uses the standard time; real staff pick 10…80 min.
                  setOrder(
                    nextDemoStatus === 'ACCEPTED'
                      ? await ordersAdmin.acceptOrder(order.id, STANDARD_PREPARATION_MINUTES)
                      : await ordersAdmin.updateStatus(order.id, nextDemoStatus),
                  );
                }}
              >
                {t('order.demoAdvance')}
              </Button>
            </div>
          )}
          {canReview(order.status) && (
            <Card>
              <ReviewForm orderId={order.id} />
            </Card>
          )}
          <PlaceholderPanel title={t('order.createAccountTitle')}>
            <p>{t('order.createAccountBody')}</p>
          </PlaceholderPanel>
        </div>
        <Card as="section" className="stack" aria-label={t('order.items')}>
          <dl className={styles.facts}>
            <dt>{t('order.pickupAt')}</dt>
            <dd>{pickup}</dd>
            <dt>{t('order.location')}</dt>
            <dd>{location ? `${location.name}, ${location.address.street}` : order.location}</dd>
            <dt>{t('order.preparationTime')}</dt>
            <dd>
              {order.preparationTime === null
                ? t('order.preparationPending', { minutes: STANDARD_PREPARATION_MINUTES })
                : t('order.minutes', { minutes: order.preparationTime })}
            </dd>
          </dl>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{t('order.items')}</h2>
          <ul className={styles.items}>
            {order.items.map((item, index) => (
              <li key={`${item.productId}-${index}`}>
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.facts}>
            <dt>{t('cart.subtotal')}</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
            {order.discount > 0 && (
              <>
                <dt>{t('cart.discount')}</dt>
                <dd>−{formatPrice(order.discount)}</dd>
              </>
            )}
            {order.tip > 0 && (
              <>
                <dt>{t('checkout.tip')}</dt>
                <dd>{formatPrice(order.tip)}</dd>
              </>
            )}
            <dt>
              <strong>{t('cart.total')}</strong>
            </dt>
            <dd>
              <strong>{formatPrice(order.total)}</strong>
            </dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
