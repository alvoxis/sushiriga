import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import styles from './DemoBanner.module.css';

/** Always visible while no backend is configured, so nobody mistakes a demo order for a real one. */
export function DemoBanner() {
  const { t } = useTranslation();
  const { config } = useServices();
  if (!config.demoMode) return null;
  return (
    <div className={styles.banner} role="note">
      <p className="container">
        <strong>{t('common.demoMode')}</strong>
        {t('common.demoModeHint')}
      </p>
    </div>
  );
}
