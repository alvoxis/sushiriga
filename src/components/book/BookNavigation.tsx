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
      <Button
        variant="secondary"
        iconOnly
        onClick={onPrevious}
        disabled={position === 0}
        aria-label={t('book.previous')}
      >
        <span aria-hidden="true">←</span>
      </Button>
      {/* Announced politely after every page turn. */}
      <p className={styles.indicator} aria-live="polite" aria-atomic="true">
        {t('book.pageOf', { current: position + 1, total: max + 1 })}
      </p>
      <Button
        variant="secondary"
        iconOnly
        onClick={onNext}
        disabled={position === max}
        aria-label={t('book.next')}
      >
        <span aria-hidden="true">→</span>
      </Button>
      {position > 0 && (
        <Button variant="ghost" size="sm" onClick={onCover}>
          {t('book.toCover')}
        </Button>
      )}
    </nav>
  );
}
