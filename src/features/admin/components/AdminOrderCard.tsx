import { useState } from 'react';
import { Badge, Button, Card, Modal, TextField } from '@/components/ui';
import { ORDER_TRANSITIONS } from '@/features/orders/orderStatus';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { useTranslation } from '@/i18n';
import {
  PREPARATION_TIME_OPTIONS,
  type AdminOrder,
  type OrderStatus,
  type PreparationTimeOption,
} from '@/types';
import styles from '@/pages/admin/admin.module.css';
import { useAdmin } from '../AdminContext';

/** Statuses after payment: cancelling refunds the payment. */
const PAID_STATES: readonly OrderStatus[] = [
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'ALMOST_READY',
  'READY',
  'DELAYED',
];
const TIME_CHANGEABLE: readonly OrderStatus[] = [
  'ACCEPTED',
  'PREPARING',
  'ALMOST_READY',
  'DELAYED',
];

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: PreparationTimeOption;
  onChange: (value: PreparationTimeOption) => void;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <label className={styles.inlineField}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as PreparationTimeOption)}
      >
        {PREPARATION_TIME_OPTIONS.map((minutes) => (
          <option key={minutes} value={minutes}>
            {t('admin.orders.minutes', { minutes })}
          </option>
        ))}
      </select>
    </label>
  );
}

/** One order on the staff board, with the actions its status allows. */
export function AdminOrderCard({
  order,
  timeZone,
  onChanged,
}: {
  order: AdminOrder;
  timeZone: string | undefined;
  onChanged: (order: AdminOrder) => void;
}) {
  const { t, locale, formatPrice } = useTranslation();
  const { admin, describeError } = useAdmin();
  const [minutes, setMinutes] = useState<PreparationTimeOption>(
    order.preparationTime ?? STANDARD_PREPARATION_MINUTES,
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).format(new Date(iso));

  async function run(action: () => Promise<AdminOrder>) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
      setNote('');
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  }

  // Next steps from the shared transition table; PAID/ACCEPTED/CANCELLED have their own controls.
  const next = ORDER_TRANSITIONS[order.status].filter(
    (status) => status !== 'PAID' && status !== 'ACCEPTED' && status !== 'CANCELLED',
  );
  const canCancel = ORDER_TRANSITIONS[order.status].includes('CANCELLED');
  const paid = PAID_STATES.includes(order.status) && order.payment !== null;
  // Stripe's technical status, in the staff's language.
  const paymentLabel =
    {
      succeeded: t('admin.orders.paymentPaid'),
      refunded: t('admin.orders.paymentRefunded'),
      processing: t('admin.orders.paymentProcessing'),
      requires_payment_method: t('admin.orders.paymentWaiting'),
      requires_confirmation: t('admin.orders.paymentWaiting'),
      requires_action: t('admin.orders.paymentWaiting'),
      canceled: t('admin.orders.paymentCanceled'),
    }[order.paymentStatus ?? ''] ??
    order.paymentStatus ??
    t('admin.orders.paymentNone');
  const tone =
    order.status === 'PAID' ? 'accent' : order.status === 'PENDING_PAYMENT' ? 'outline' : 'indigo';

  return (
    <Card as="article" className={styles.orderCard} data-status={order.status}>
      <header className={styles.orderHeader}>
        <h3 className={styles.orderId}>{order.id}</h3>
        <Badge tone={tone}>{t(`order.status.${order.status}`)}</Badge>
        <span className={styles.muted}>
          {t('admin.orders.created', { time: time(order.createdAt) })}
        </span>
      </header>

      <dl className={styles.facts}>
        <dt>{t('admin.orders.pickup')}</dt>
        <dd>
          <strong>
            {order.pickupTime === 'asap' ? t('admin.orders.asap') : time(order.pickupTime)}
          </strong>
          {order.preparationTime !== null &&
            ` · ${t('admin.orders.minutes', { minutes: order.preparationTime })}`}
        </dd>
        <dt>{t('admin.orders.customer')}</dt>
        <dd>
          {order.customer.name} ·{' '}
          <a href={`tel:${order.customer.phone.replace(/[^\d+]/g, '')}`}>{order.customer.phone}</a>
          {order.customer.email && ` · ${order.customer.email}`}
        </dd>
        <dt>{t('admin.orders.payment')}</dt>
        <dd>{paymentLabel}</dd>
      </dl>

      <ul className={styles.lines} role="list">
        {order.items.map((item, index) => (
          <li key={`${item.productId}-${index}`}>
            <span>
              <strong>{item.quantity} ×</strong> {item.name}
            </span>
            <span>{formatPrice(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.totals}>
        {order.promoCode && (
          <span>
            {t('admin.orders.promo', { code: order.promoCode })} −{formatPrice(order.discount)}{' '}
            ·{' '}
          </span>
        )}
        {order.tip > 0 && (
          <span>
            {t('admin.orders.tip')} {formatPrice(order.tip)} ·{' '}
          </span>
        )}
        <strong>
          {t('admin.orders.total')} {formatPrice(order.total)}
        </strong>
      </p>

      {order.status === 'PENDING_PAYMENT' && (
        <p className={styles.warning}>{t('admin.orders.unpaidNote')}</p>
      )}

      <div className={styles.actions}>
        {order.status === 'PAID' && (
          <>
            <TimeSelect value={minutes} onChange={setMinutes} label={t('admin.orders.prepTime')} />
            <Button disabled={busy} onClick={() => void run(() => admin.accept(order.id, minutes))}>
              {t('admin.orders.accept')}
            </Button>
          </>
        )}
        {next.map((status) => (
          <Button
            key={status}
            variant={status === 'DELAYED' ? 'secondary' : 'primary'}
            disabled={busy}
            onClick={() =>
              void run(() =>
                admin.setStatus(order.id, status, status === 'DELAYED' ? note : undefined),
              )
            }
          >
            {t('admin.orders.moveTo', { status: t(`order.status.${status}`) })}
          </Button>
        ))}
      </div>

      {next.includes('DELAYED') && (
        <TextField
          label={t('admin.orders.delayNote')}
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
        />
      )}

      {TIME_CHANGEABLE.includes(order.status) && (
        <div className={styles.actions}>
          <TimeSelect value={minutes} onChange={setMinutes} label={t('admin.orders.prepTime')} />
          <Button
            variant="secondary"
            disabled={busy || minutes === order.preparationTime}
            onClick={() => void run(() => admin.setPreparationTime(order.id, minutes))}
          >
            {t('admin.orders.changeTime')}
          </Button>
        </div>
      )}

      {canCancel && (
        <div>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmCancel(true)}>
            {t('admin.orders.cancel')}
          </Button>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <details className={styles.history}>
        <summary>{t('admin.orders.history')}</summary>
        <ol>
          {order.statusHistory.map((change, index) => (
            <li key={index}>
              {time(change.at)} — {t(`order.status.${change.status}`)}
              {change.note && ` (${change.note})`}
            </li>
          ))}
        </ol>
      </details>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={t('admin.orders.cancelTitle', { id: order.id })}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              {t('admin.orders.keep')}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setConfirmCancel(false);
                void run(() => admin.setStatus(order.id, 'CANCELLED', note || undefined));
              }}
            >
              {t('admin.orders.cancelConfirm')}
            </Button>
          </>
        }
      >
        <p>
          {paid
            ? t('admin.orders.cancelPaid', { amount: formatPrice(order.total) })
            : t('admin.orders.cancelUnpaid')}
        </p>
      </Modal>
    </Card>
  );
}
