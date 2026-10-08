import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import styles from './Card.module.css';

export function Card({
  as: Tag = 'div',
  flat,
  interactive,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section' | 'li';
  flat?: boolean;
  interactive?: boolean;
}) {
  return (
    <Tag
      className={cn(styles.card, flat && styles.flat, interactive && styles.interactive, className)}
      {...props}
    />
  );
}
