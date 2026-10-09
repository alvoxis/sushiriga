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
          // The name starts with the visible code (WCAG 2.5.3 "label in name"): "lv — Latviešu".
          aria-label={`${code} — ${t(`common.languageNames.${code}`)}`}
          onClick={() => setLocale(code)}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
