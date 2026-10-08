import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Card, PageHeader, PlaceholderPanel } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { useTranslation, type MessageKey } from '@/i18n';
import styles from '../page.module.css';

const SECTIONS: {
  key: 'profile' | 'orders' | 'reviews' | 'promocodes' | 'tips' | 'settings';
  to?: string;
}[] = [
  { key: 'profile' },
  { key: 'orders', to: ROUTES.accountOrders },
  { key: 'reviews', to: ROUTES.accountReviews },
  { key: 'promocodes', to: ROUTES.accountPromocodes },
  { key: 'tips', to: ROUTES.accountTips },
  { key: 'settings' },
];

/** Account hub. There is intentionally NO bonus / loyalty-points section in this project. */
export default function AccountPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('account.title'));
  return (
    <div className="container">
      <PageHeader title={t('account.title')} lead={t('account.lead')} />
      <PlaceholderPanel title={t('account.signInSoon')} />
      <ul className={`${styles.grid} ${styles.sectionGap}`} role="list">
        {SECTIONS.map((section) => {
          const title = t(`account.sections.${section.key}` as MessageKey);
          const body = t(`account.descriptions.${section.key}` as MessageKey);
          return (
            <li key={section.key}>
              <Card interactive={!!section.to} style={{ height: '100%' }}>
                {section.to ? (
                  <Link to={section.to} className={styles.cardLink}>
                    <h2 className={styles.cardTitle}>{title}</h2>
                    <p className={styles.muted}>{body}</p>
                  </Link>
                ) : (
                  <div className={styles.cardLink}>
                    <h2 className={styles.cardTitle}>{title}</h2>
                    <p className={styles.muted}>{body}</p>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
