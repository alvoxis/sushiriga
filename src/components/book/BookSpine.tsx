import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { cn } from '@/utils/cn';
import styles from './BookSpine.module.css';

interface BookSpineProps {
  /** 'binding' = decorative strip on an open book; 'shelf' = a book standing on the menu shelf. */
  variant?: 'binding' | 'shelf';
  title?: string;
  label?: string;
  /** Turns the spine into a link (shelf). */
  to?: string;
  ariaLabel?: string;
  color?: string;
  height?: string;
  className?: string;
}

export function BookSpine({
  variant = 'shelf',
  title,
  label,
  to,
  ariaLabel,
  color,
  height,
  className,
}: BookSpineProps) {
  const style = { '--spine-color': color, '--spine-height': height } as CSSProperties;
  const content =
    variant === 'binding' ? null : (
      <>
        <span className={styles.band} aria-hidden="true" />
        {title && <span className={styles.title}>{title}</span>}
        {label && <span className={styles.label}>{label}</span>}
      </>
    );
  const classes = cn(styles.spine, styles[variant], className);

  if (to) {
    return (
      <Link to={to} className={classes} style={style} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }
  return (
    <div className={classes} style={style} aria-hidden={variant === 'binding' ? true : undefined}>
      {content}
    </div>
  );
}
