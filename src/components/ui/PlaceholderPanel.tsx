import type { ReactNode } from 'react';
import { useTranslation } from '@/i18n';
import { Badge } from './Badge';
import styles from './Placeholder.module.css';

/** Clearly marked placeholder for a feature that is designed but not built yet. */
export function PlaceholderPanel({ title, children }: { title: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className={styles.panel}>
      <Badge tone="outline">{t('common.comingSoon')}</Badge>
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
    </section>
  );
}
