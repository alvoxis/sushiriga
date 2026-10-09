import { useEffect, useState } from 'react';
import { Button, ChoiceGroup } from '@/components/ui';
import { useAdmin } from '@/features/admin/AdminContext';
import { AdminOrderCard } from '@/features/admin/components/AdminOrderCard';
import { useActiveLocations } from '@/features/pickup/useLocations';
import { useTranslation } from '@/i18n';
import type { AdminOrder, DaySummary, OrderStatus } from '@/types';
import styles from './admin.module.css';

type Filter = 'new' | 'active' | 'ready' | 'unpaid' | 'done';

const FILTERS: Record<Filter, OrderStatus[]> = {
  new: ['PAID'],
  active: ['ACCEPTED', 'PREPARING', 'ALMOST_READY', 'DELAYED'],
  ready: ['READY'],
  unpaid: ['PENDING_PAYMENT'],
  done: ['PICKED_UP', 'CANCELLED'],
};

/** New paid orders arrive here; the board refreshes itself every 15 seconds. */
const REFRESH_MS = 15_000;

export default function AdminOrdersPage() {
  const { t, locale, formatPrice } = useTranslation();
  const { admin, describeError } = useAdmin();
  const timeZone = useActiveLocations()[0]?.timeZone;
  const [filter, setFilter] = useState<Filter>('new');
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Loads the board now and every REFRESH_MS; state is only set in the promise callbacks.
  useEffect(() => {
    let active = true;
    const tick = () =>
      Promise.all([admin.orders(FILTERS[filter]), admin.summary()]).then(
        ([list, today]) => {
          if (!active) return;
          setOrders(list);
          setSummary(today);
          setUpdatedAt(new Date());
          setError(null);
        },
        (failure: unknown) => active && setError(describeError(failure)),
      );
    void tick();
    const timer = setInterval(() => void tick(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [admin, filter, describeError, refreshKey]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>{t('admin.orders.title')}</h1>
        <Button variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
          {t('admin.orders.refresh')}
        </Button>
      </div>
      {summary && (
        <p className={styles.summary} data-testid="admin-summary">
          {t('admin.orders.summary', {
            count: summary.paidOrders,
            revenue: formatPrice(summary.revenue),
            tips: formatPrice(summary.tips),
          })}
        </p>
      )}
      <ChoiceGroup<Filter>
        legend={t('admin.orders.filtersLabel')}
        legendHidden
        value={filter}
        onChange={(value) => {
          setOrders(null);
          setFilter(value);
        }}
        choices={(Object.keys(FILTERS) as Filter[]).map((value) => ({
          value,
          label: t(`admin.orders.filters.${value}`),
        }))}
      />
      {updatedAt && (
        <p className={styles.muted} aria-live="polite">
          {t('admin.orders.updated', {
            time: new Intl.DateTimeFormat(locale, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hourCycle: 'h23',
            }).format(updatedAt),
          })}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {orders === null ? (
        <p role="status">{t('common.loading')}</p>
      ) : orders.length === 0 ? (
        <p>{t('admin.orders.empty')}</p>
      ) : (
        <ul className={styles.orderList} role="list">
          {orders.map((order) => (
            <li key={order.id}>
              <AdminOrderCard
                order={order}
                timeZone={timeZone}
                onChanged={(changed) => {
                  // Leaves the current tab when its status no longer matches the filter.
                  setOrders((list) =>
                    (list ?? [])
                      .map((o) => (o.id === changed.id ? changed : o))
                      .filter((o) => FILTERS[filter].includes(o.status)),
                  );
                  void admin.summary().then(setSummary, () => undefined);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
