import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/i18n';
import { AssistantCharacter } from './AssistantCharacter';
import styles from './assistant.module.css';

/** The cat's spot on the home page — a link into the assistant. */
export function AssistantTeaser() {
  const { t } = useTranslation();
  return (
    <Link to={ROUTES.assistant} className={styles.teaser} style={{ textDecoration: 'none' }}>
      <AssistantCharacter size="5.5rem" />
      <span className={styles.bubble}>{t('assistant.teaser')}</span>
    </Link>
  );
}
