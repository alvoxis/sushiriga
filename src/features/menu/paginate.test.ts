import { chunkIndexes, packPages, samePages } from './paginate';

describe('book pagination', () => {
  it('fills pages greedily in menu order', () => {
    expect(packPages([100, 100, 100, 100, 100], 250)).toEqual([[0, 1], [2, 3], [4]]);
  });

  it('puts an item that is taller than a page on its own page', () => {
    expect(packPages([50, 400, 50], 300)).toEqual([[0], [1], [2]]);
  });

  it('uses exact fits and handles empty input', () => {
    expect(packPages([100, 100, 100], 300)).toEqual([[0, 1, 2]]);
    expect(packPages([], 300)).toEqual([]);
  });

  it('never loses or reorders items', () => {
    const heights = Array.from({ length: 17 }, (_, i) => 60 + ((i * 37) % 90));
    expect(packPages(heights, 230).flat()).toEqual(heights.map((_, i) => i));
  });

  it('has a fixed-size fallback and compares page layouts', () => {
    expect(chunkIndexes(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(samePages([[0, 1], [2]], [[0, 1], [2]])).toBe(true);
    expect(samePages([[0, 1], [2]], [[0], [1, 2]])).toBe(false);
  });
});
