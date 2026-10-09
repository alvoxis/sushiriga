import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { leavesFor, type BookLayout } from './bookModel';
import styles from './Book.module.css';

interface BookPagesProps {
  faces: ReactNode[];
  layout: BookLayout;
  position: number;
  visibleFaces: number[];
  activeLeaf: number | null;
}

/** Renders the stack of leaves. Each leaf turns around the spine with a 3D rotation. */
export function BookPages({ faces, layout, position, visibleFaces, activeLeaf }: BookPagesProps) {
  const leaves = leavesFor(faces.length, layout);
  const count = leaves.length;

  return (
    <div className={styles.mover}>
      <div className={styles.block} aria-hidden="true" />
      {layout === 'single' && position > 0 && (
        <span className={styles.binding} aria-hidden="true" />
      )}
      {leaves.map((leaf, index) => {
        const flipped = index < position;
        // Unturned leaves: first on top. Turned leaves: last turned on top.
        const zIndex = index === activeLeaf ? count + 2 : flipped ? index + 1 : count - index + 1;
        return (
          <div
            key={leaf.front}
            className={cn(
              styles.leaf,
              flipped && styles.flipped,
              index === activeLeaf && styles.turning,
            )}
            style={{ zIndex } as CSSProperties}
            data-leaf={index}
          >
            {/* The cover leaf carries the spine, so it turns away with the cover. */}
            {leaf.front === 0 && <span className={styles.hinge} aria-hidden="true" />}
            <Face index={leaf.front} visible={visibleFaces.includes(leaf.front)}>
              {faces[leaf.front]}
            </Face>
            {leaf.back !== undefined && (
              <Face index={leaf.back} visible={visibleFaces.includes(leaf.back)} back>
                {faces[leaf.back]}
              </Face>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Face({
  index,
  visible,
  back,
  children,
}: {
  index: number;
  visible: boolean;
  back?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(styles.face, back && styles.faceBack, index === 0 && styles.faceCover)}
      inert={!visible}
      aria-hidden={visible ? undefined : true}
      data-face={index}
      data-visible={visible || undefined}
    >
      {children}
    </div>
  );
}
