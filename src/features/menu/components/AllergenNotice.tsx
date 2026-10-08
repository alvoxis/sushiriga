import { SUSHI_MAY_CONTAIN } from '@/data/menu';
import { useTranslation } from '@/i18n';
import type { Category } from '@/types';
import styles from './menu.module.css';

export function AllergenNotice({ category }: { category?: Category }) {
  const { t } = useTranslation();
  return (
    <aside className={styles.allergens} aria-label={t('menu.allergensTitle')}>
      {(!category || category.sushiAllergenNotice) && (
        <p>{t('menu.allergenNotice', { codes: SUSHI_MAY_CONTAIN.join(', ') })}</p>
      )}
      <p>{t('menu.allergensMissing')}</p>
    </aside>
  );
}
