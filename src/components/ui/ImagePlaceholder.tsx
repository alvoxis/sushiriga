import type { CSSProperties } from 'react';
import { cn } from '@/utils/cn';
import styles from './ImagePlaceholder.module.css';

/**
 * Neutral stand-in until real product photos exist. Decorative only — product names are
 * always present as text next to it. No stock or generated images are used on purpose.
 */
export function ImagePlaceholder({
  label,
  ratio = '4 / 3',
  compact,
  className,
}: {
  label?: string;
  ratio?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(styles.placeholder, compact && styles.compact, className)}
      style={{ '--ratio': ratio } as CSSProperties}
      aria-hidden="true"
    >
      <svg
        className={styles.mark}
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {/* a simple maki roll: nori ring, rice, filling */}
        <circle cx="32" cy="32" r="22" />
        <circle cx="32" cy="32" r="17" strokeDasharray="2 3" />
        <circle cx="32" cy="32" r="7" />
      </svg>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
