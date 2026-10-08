import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { PageHeader, PlaceholderPanel } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';

export type AccountSection = 'orders' | 'reviews' | 'promocodes' | 'tips';

/** Shared placeholder for account sub-pages until authentication exists. */
export function AccountSectionPage({ section }: { section: AccountSection }) {
  const { t } = useTranslation();
  const title = t(`account.sections.${section}`);
  useDocumentTitle(title);
  return (
    <div className="container">
      <p style={{ paddingTop: 'var(--space-4)' }}>
        <Link to={ROUTES.account}>← {t('account.title')}</Link>
      </p>
      <PageHeader title={title} lead={t(`account.descriptions.${section}`)} />
      <PlaceholderPanel title={t('account.signInSoon')}>
        <p>{t('account.lead')}</p>
      </PlaceholderPanel>
    </div>
  );
}
