import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useBookControls } from './BookContext';
import styles from './BookCover.module.css';

export type CoverPattern = 'seigaiha' | 'shippo' | 'kikko' | 'linen';

interface BookCoverProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Gold-foil cloth pattern. The cloth colour comes from the `--cover` CSS variable. */
  pattern?: CoverPattern;
  /** Label of the "open" button printed on the cover (turns to the first page). */
  openLabel?: string;
  footer?: ReactNode;
}

/** Cloth-bound cover: foil frame, embossed title, a small vermilion seal and soft light. */
export function BookCover({
  eyebrow = 'SUSHIRIGA',
  title,
  subtitle,
  pattern = 'linen',
  openLabel,
  footer,
}: BookCoverProps) {
  const controls = useBookControls();
  return (
    <div className={cn(styles.cover, styles[pattern])}>
      <span className={styles.frame} aria-hidden="true" />
      <p className={styles.eyebrow}>{eyebrow}</p>
      <div className={styles.titleBlock}>
        <span className={styles.rule} aria-hidden="true" />
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.footer}>
        {openLabel && controls && (
          <button type="button" className={styles.open} onClick={controls.next}>
            {openLabel}
          </button>
        )}
        <span className={styles.seal} aria-hidden="true">
          SR
        </span>
        {footer}
      </div>
    </div>
  );
}
