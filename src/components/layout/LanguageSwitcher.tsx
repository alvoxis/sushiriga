import { useTranslation } from '@/i18n';
import { LOCALES } from '@/types';
import styles from './LanguageSwitcher.module.css';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div className={styles.switcher} role="group" aria-label={t('nav.language')}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={styles.option}
          aria-pressed={code === locale}
          lang={code}
          aria-label={t(`common.languageNames.${code}`)}
          onClick={() => setLocale(code)}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
