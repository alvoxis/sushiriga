import type { CSSProperties } from 'react';
import type { AssistantMood } from '@/types';
import { cn } from '@/utils/cn';
import styles from './AssistantCharacter.module.css';

/**
 * The SUSHIRIGA cat — a reusable, self-contained SVG character.
 * Future: walking across the screen and reacting to app events can be layered on top through
 * the `mood` prop (and new moods) without changing the components that use it.
 */
export function AssistantCharacter({
  mood = 'idle',
  size = '7rem',
  label,
  className,
}: {
  mood?: AssistantMood;
  size?: string;
  /** Accessible name; omit to render the cat as decoration. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={cn(styles.cat, styles[mood], className)}
      style={{ '--cat-size': size } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-mood={mood}
    >
      <path className={styles.tail} d="M84 124c20-4 26-24 16-40" />
      <path className={styles.body} d="M34 130c-4-30 6-54 26-56 20 2 30 26 26 56z" />
      <path className={styles.line} d="M46 130c2-6 8-6 10 0M64 130c2-6 8-6 10 0" />
      <path
        className={styles.head}
        d="M36 56c0-16 2-30 4-42l15 14c3-.5 7-.5 10 0l15-14c2 12 4 26 4 42 0 14-11 22-24 22s-24-8-24-22z"
      />
      {mood === 'happy' ? (
        <path className={styles.line} d="M46 55q4-5 8 0M66 55q4-5 8 0" />
      ) : (
        <>
          <ellipse className={styles.eye} cx="50" cy="54" rx="3" ry="4" />
          <ellipse className={styles.eye} cx="70" cy="54" rx="3" ry="4" />
        </>
      )}
      <path className={styles.line} d="M58 62h4l-2 2.5z" />
      <path className={cn(styles.line, styles.mouth)} d="M56 67q4 3 8 0" />
      <path
        className={styles.line}
        d="M30 60h12M30 66l12-2M90 60H78M90 66l-12-2"
        strokeWidth="1.2"
      />
      <path className={styles.collar} d="M44 76q16 8 32 0" />
      <circle className={styles.bell} cx="60" cy="82" r="3.2" />
    </svg>
  );
}
