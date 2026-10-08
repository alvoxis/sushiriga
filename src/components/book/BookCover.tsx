import type { ReactNode } from 'react';
import styles from './BookCover.module.css';

interface BookCoverProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** e.g. an "Open" button or the item count. */
  footer?: ReactNode;
}

/** Cloth-bound cover with a foil frame and a small vermilion seal. */
export function BookCover({ eyebrow = 'SUSHIRIGA', title, subtitle, footer }: BookCoverProps) {
  return (
    <div className={styles.cover}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.footer}>
        <span className={styles.seal} aria-hidden="true">
          SR
        </span>
        {footer}
      </div>
    </div>
  );
}
