import { useTranslation } from '@/i18n';
import styles from './SkipLink.module.css';

export const MAIN_CONTENT_ID = 'main-content';

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a className={styles.skip} href={`#${MAIN_CONTENT_ID}`}>
      {t('common.skipToContent')}
    </a>
  );
}
