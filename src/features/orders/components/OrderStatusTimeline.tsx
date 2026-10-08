import { useTranslation } from '@/i18n';
import type { OrderStatus } from '@/types';
import { ORDER_PROGRESS } from '../orderStatus';
import styles from './orders.module.css';

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const currentIndex = ORDER_PROGRESS.indexOf(status);
  const offPath = currentIndex === -1; // DELAYED or CANCELLED
  return (
    <div className={styles.timelineWrap}>
      <p className={styles.current} role="status" data-testid="order-status">
        <strong>{t(`order.status.${status}`)}</strong> — {t(`order.statusHint.${status}`)}
      </p>
      {!offPath || status === 'DELAYED' ? (
        <ol className={styles.timeline} aria-label={t('order.progress')}>
          {ORDER_PROGRESS.map((step, index) => {
            const state = offPath
              ? 'todo'
              : index < currentIndex
                ? 'done'
                : index === currentIndex
                  ? 'current'
                  : 'todo';
            return (
              <li
                key={step}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {t(`order.status.${step}`)}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
