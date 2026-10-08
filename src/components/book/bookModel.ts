/**
 * Book geometry, independent of React.
 *
 * A book has F "faces": face 0 is the cover, faces 1…F-1 are pages.
 * - single layout (phones): one face visible at a time; position = face index.
 * - spread layout (tablets/desktop): faces are printed on leaves — leaf k carries face 2k on its
 *   front and face 2k+1 on its back. Position = number of leaves turned; at position p the left
 *   page is face 2p-1 and the right page is face 2p.
 *
 * The state is an "anchor face", so switching layout (rotating a phone) keeps the reader on
 * the same page.
 */
export type BookLayout = 'single' | 'spread';

export interface Leaf {
  front: number;
  back?: number;
}

export function leavesFor(faceCount: number, layout: BookLayout): Leaf[] {
  if (layout === 'single') return Array.from({ length: faceCount }, (_, i) => ({ front: i }));
  const leaves: Leaf[] = [];
  for (let front = 0; front < faceCount; front += 2) {
    leaves.push(front + 1 < faceCount ? { front, back: front + 1 } : { front });
  }
  return leaves;
}

export function maxPosition(faceCount: number, layout: BookLayout): number {
  if (faceCount <= 0) return 0;
  return layout === 'single' ? faceCount - 1 : Math.floor(faceCount / 2);
}

export function positionOf(anchorFace: number, layout: BookLayout): number {
  return layout === 'single' ? anchorFace : Math.ceil(anchorFace / 2);
}

export function anchorFor(position: number, faceCount: number, layout: BookLayout): number {
  const p = clamp(position, 0, maxPosition(faceCount, layout));
  if (layout === 'single') return p;
  const right = 2 * p;
  return right < faceCount ? right : right - 1;
}

/** Faces currently visible to the reader (used for `inert` and announcements). */
export function visibleFaces(position: number, faceCount: number, layout: BookLayout): number[] {
  if (layout === 'single') return [position];
  return [2 * position - 1, 2 * position].filter((f) => f >= 0 && f < faceCount);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
