import { Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import styles from './BookNavigation.module.css';

interface BookNavigationProps {
  position: number;
  max: number;
  onPrevious: () => void;
  onNext: () => void;
  onCover: () => void;
}

/**
 * Real buttons for every way of turning pages (swipe, corners and keys are shortcuts).
 * The accessible name starts with the visible label (WCAG 2.5.3 "label in name") and adds
 * context for screen readers ("Next" → "Next page").
 */
export function BookNavigation({
  position,
  max,
  onPrevious,
  onNext,
  onCover,
}: BookNavigationProps) {
  const { t } = useTranslation();
  return (
    <nav className={styles.nav} aria-label={t('book.navigation')}>
      <div className={styles.row}>
        <Button
          variant="secondary"
          className={styles.turn}
          onClick={onPrevious}
          disabled={position === 0}
          aria-label={t('book.previousShort') + t('book.previousSuffix')}
        >
          <span aria-hidden="true">←</span>
          {t('book.previousShort')}
        </Button>
        {/* Announced politely after every page turn. */}
        <p className={styles.indicator} aria-live="polite" aria-atomic="true">
          {t('book.pageOf', { current: position + 1, total: max + 1 })}
        </p>
        <Button
          variant="secondary"
          className={styles.turn}
          onClick={onNext}
          disabled={position === max}
          aria-label={t('book.nextShort') + t('book.nextSuffix')}
        >
          {t('book.nextShort')}
          <span aria-hidden="true">→</span>
        </Button>
      </div>
      {position > 0 && (
        <Button variant="ghost" size="sm" onClick={onCover}>
          {t('book.toCover')}
        </Button>
      )}
    </nav>
  );
}
