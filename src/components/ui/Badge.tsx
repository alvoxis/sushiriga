import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'indigo' | 'matcha' | 'outline';

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span className={cn(styles.badge, tone !== 'neutral' && styles[tone], className)} {...props} />
  );
}
