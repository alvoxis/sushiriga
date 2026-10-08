import { useTranslation } from '@/i18n';
import type { LocalizedText } from '@/types';
import { pickLocalized } from '@/utils/localized';

/**
 * Renders menu text in the user's language. If the source menu has no text in that language,
 * shows the closest available language with a `lang` attribute and a small marker — we never
 * machine-translate menu content at runtime.
 */
export function LocalizedBlock({
  text,
  className,
  as: Tag = 'p',
}: {
  text?: LocalizedText;
  className?: string;
  as?: 'p' | 'span';
}) {
  const { locale, t } = useTranslation();
  const picked = pickLocalized(text, locale);
  if (!picked) return null;
  return (
    <Tag className={className} lang={picked.locale} style={{ whiteSpace: 'pre-line' }}>
      {picked.text}
      {picked.isFallback && (
        <span className="visually-hidden">
          {' '}
          ({t('menu.shownInLanguage', { language: t(`common.languageNames.${picked.locale}`) })})
        </span>
      )}
    </Tag>
  );
}
