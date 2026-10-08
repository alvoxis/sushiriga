import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useMediaQuery, useSwipe } from '@/hooks';
import { useTranslation } from '@/i18n';
import { cn } from '@/utils/cn';
import { BookContext, type BookControls } from './BookContext';
import {
  anchorFor,
  clamp,
  maxPosition,
  positionOf,
  visibleFaces,
  type BookLayout,
} from './bookModel';
import { BookNavigation } from './BookNavigation';
import { BookPages } from './BookPages';
import styles from './Book.module.css';

export interface BookProps {
  /** Used for the accessible name ("Rolli — menu book"). */
  title: string;
  /** Face 0. Usually a <BookCover>. */
  cover: ReactNode;
  /** Faces 1…n. Usually <BookPage> elements. */
  pages: ReactNode[];
  /** 'auto' = spread from 900px viewport width, single page below. */
  layout?: BookLayout | 'auto';
  initialFace?: number;
  onFaceChange?: (face: number) => void;
  className?: string;
}

const SPREAD_QUERY = '(min-width: 56.25rem)';
const FLIP_MS = 700;

/**
 * Interactive book: 3D page turning, swipe, mouse corners, keyboard (←/→, PageUp/PageDown,
 * Home/End) and accessible navigation. Pages that are not visible are `inert`, so focus and
 * screen readers only ever reach the open pages. Reduced motion → instant page changes.
 */
export function Book({
  title,
  cover,
  pages,
  layout = 'auto',
  initialFace = 0,
  onFaceChange,
  className,
}: BookProps) {
  const { t } = useTranslation();
  const prefersSpread = useMediaQuery(SPREAD_QUERY);
  const resolved: BookLayout = layout === 'auto' ? (prefersSpread ? 'spread' : 'single') : layout;

  const faces = useMemo(() => [cover, ...pages], [cover, pages]);
  const faceCount = faces.length;
  const [anchor, setAnchor] = useState(() => clamp(initialFace, 0, faceCount - 1));
  const [activeLeaf, setActiveLeaf] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const safeAnchor = clamp(anchor, 0, faceCount - 1);
  const position = positionOf(safeAnchor, resolved);
  const max = maxPosition(faceCount, resolved);

  useEffect(() => () => clearTimeout(timer.current), []);

  const goToPosition = useCallback(
    (target: number) => {
      const next = clamp(target, 0, max);
      if (next === position) return;
      // The leaf that turns gets a temporary z-index boost so it stays on top while moving.
      const turning = next > position ? next - 1 : next;
      setActiveLeaf(turning);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setActiveLeaf(null), FLIP_MS);
      const nextAnchor = anchorFor(next, faceCount, resolved);
      setAnchor(nextAnchor);
      onFaceChange?.(nextAnchor);
    },
    [faceCount, max, onFaceChange, position, resolved],
  );

  const controls = useMemo<BookControls>(
    () => ({
      next: () => goToPosition(position + 1),
      previous: () => goToPosition(position - 1),
      goToFace: (face) => goToPosition(positionOf(clamp(face, 0, faceCount - 1), resolved)),
    }),
    [faceCount, goToPosition, position, resolved],
  );

  const swipe = useSwipe({ onSwipeLeft: controls.next, onSwipeRight: controls.previous });

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const actions: Record<string, () => void> = {
      ArrowRight: controls.next,
      PageDown: controls.next,
      ArrowLeft: controls.previous,
      PageUp: controls.previous,
      Home: () => goToPosition(0),
      End: () => goToPosition(max),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  const visible = visibleFaces(position, faceCount, resolved);
  const closedFront = position === 0;
  const closedBack = resolved === 'spread' && position === max && faceCount % 2 === 0;

  return (
    <BookContext.Provider value={controls}>
      {/* A focusable region (like a scroll container) that also understands arrow keys. Every
          keyboard action is equally available through the real buttons in BookNavigation. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <section
        className={cn(
          styles.book,
          resolved === 'spread' && styles.spread,
          closedFront && styles.closedFront,
          closedBack && styles.closedBack,
          className,
        )}
        aria-roledescription="book"
        aria-label={t('book.label', { title })}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-layout={resolved}
        data-position={position}
      >
        <div className={styles.scene} {...swipe}>
          <BookPages
            faces={faces}
            layout={resolved}
            position={position}
            visibleFaces={visible}
            activeLeaf={activeLeaf}
          />
          {/* Mouse-only page corners; keyboard and screen-reader users have BookNavigation. */}
          <button
            type="button"
            className={cn(styles.corner, styles.cornerPrev)}
            onClick={controls.previous}
            disabled={position === 0}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            className={cn(styles.corner, styles.cornerNext)}
            onClick={controls.next}
            disabled={position === max}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        <BookNavigation
          position={position}
          max={max}
          onPrevious={controls.previous}
          onNext={controls.next}
          onCover={() => goToPosition(0)}
        />
        <p className={styles.hint}>{t('book.swipeHint')}</p>
      </section>
    </BookContext.Provider>
  );
}
