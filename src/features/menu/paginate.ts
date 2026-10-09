/**
 * Greedy pagination by measured height: items stay in menu order, a page takes items while they
 * fit; an item taller than a whole page gets a page of its own (its text is line-clamped).
 * Returns item indexes per page.
 */
export function packPages(heights: number[], available: number): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  heights.forEach((height, index) => {
    if (current.length && used + height > available) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(index);
    used += height;
  });
  if (current.length) pages.push(current);
  return pages;
}

/** Fallback when nothing can be measured (e.g. server rendering, tests): fixed page size. */
export function chunkIndexes(count: number, size: number): number[][] {
  const pages: number[][] = [];
  for (let i = 0; i < count; i += size) {
    pages.push(Array.from({ length: Math.min(size, count - i) }, (_, k) => i + k));
  }
  return pages;
}

export function samePages(a: number[][], b: number[][]): boolean {
  return a.length === b.length && a.every((page, i) => page.join() === b[i]?.join());
}
