import { ROUTES } from '@/app/routes';
import { ButtonLink, PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';

export default function NotFoundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('common.notFoundTitle'));
  return (
    <div className="container">
      <PageHeader title={t('common.notFoundTitle')} lead={t('common.notFoundBody')} />
      <ButtonLink to={ROUTES.home}>{t('common.goHome')}</ButtonLink>
    </div>
  );
}
