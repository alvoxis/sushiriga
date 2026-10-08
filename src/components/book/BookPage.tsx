import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import styles from './BookPage.module.css';

interface BookPageProps {
  /** Running head (top of the page), e.g. the category name. */
  heading?: string;
  /** Page number printed at the bottom. */
  folio?: number;
  variant?: 'default' | 'endpaper';
  children?: ReactNode;
}

export function BookPage({ heading, folio, variant = 'default', children }: BookPageProps) {
  return (
    <article className={cn(styles.page, variant === 'endpaper' && styles.endpaper)}>
      {heading && (
        <header className={styles.running}>
          <span>SUSHIRIGA</span>
          <span>{heading}</span>
        </header>
      )}
      <div className={styles.body}>{children}</div>
      {folio !== undefined && (
        <footer className={styles.folio} aria-hidden="true">
          {folio}
        </footer>
      )}
    </article>
  );
}
