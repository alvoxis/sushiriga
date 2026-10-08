import { PageHeader } from '@/components/ui';
import { AIAssistant } from '@/features/assistant/components/AIAssistant';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';

export default function AssistantPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('assistant.title'));
  return (
    <div className="container">
      <PageHeader title={t('assistant.title')} lead={t('assistant.lead')} />
      <AIAssistant />
    </div>
  );
}
