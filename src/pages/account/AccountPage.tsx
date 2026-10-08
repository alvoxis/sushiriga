import { Link } from 'react-router';
import { Card, PageHeader, PlaceholderPanel } from '@/components/ui';
import { ACCOUNT_SECTIONS } from '@/features/account/accountSections';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import styles from '../page.module.css';

/** Account hub. There is intentionally NO bonus / loyalty-points section in this project. */
export default function AccountPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('account.title'));
  return (
    <div className="container">
      <PageHeader title={t('account.title')} lead={t('account.lead')} />
      <PlaceholderPanel title={t('account.signInSoon')} />
      <ul className={`${styles.grid} ${styles.sectionGap}`} role="list">
        {ACCOUNT_SECTIONS.map((section) => {
          const to = 'to' in section ? section.to : undefined;
          const title = t(`account.sections.${section.key}`);
          const body = t(`account.descriptions.${section.key}`);
          return (
            <li key={section.key}>
              <Card interactive={!!to} style={{ height: '100%' }}>
                {to ? (
                  <Link to={to} className={styles.cardLink}>
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
