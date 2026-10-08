import { useId } from 'react';
import { useTranslation } from '@/i18n';
import { RATINGS, type Rating } from '@/types';
import styles from './reviews.module.css';

/**
 * 1–5 star rating as a native radio group. Starts EMPTY (`null`) — we never pre-select stars.
 */
export function RatingInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: Rating | null;
  onChange: (value: Rating) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const name = useId();
  return (
    <fieldset className={styles.rating} aria-invalid={error ? true : undefined}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.stars}>
        {RATINGS.map((rating) => (
          <label
            key={rating}
            className={styles.star}
            data-active={value !== null && rating <= value ? true : undefined}
          >
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              aria-label={t('reviews.starLabel', { count: rating })}
            />
            <span aria-hidden="true">★</span>
          </label>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </fieldset>
  );
}
