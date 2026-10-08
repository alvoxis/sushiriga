import { anchorFor, leavesFor, maxPosition, positionOf, visibleFaces } from './bookModel';

describe('book model', () => {
  it('single layout: one leaf per face', () => {
    expect(leavesFor(4, 'single')).toHaveLength(4);
    expect(maxPosition(4, 'single')).toBe(3);
    expect(visibleFaces(2, 4, 'single')).toEqual([2]);
  });

  it('spread layout: two faces per leaf', () => {
    expect(leavesFor(5, 'spread')).toEqual([
      { front: 0, back: 1 },
      { front: 2, back: 3 },
      { front: 4 },
    ]);
    expect(maxPosition(5, 'spread')).toBe(2);
    expect(maxPosition(6, 'spread')).toBe(3);
    expect(visibleFaces(0, 5, 'spread')).toEqual([0]);
    expect(visibleFaces(1, 5, 'spread')).toEqual([1, 2]);
  });

  it('keeps the reader on the same page when the layout changes', () => {
    // reading face 3 on a phone → spread position 2 shows faces 3 and 4
    expect(positionOf(3, 'spread')).toBe(2);
    expect(visibleFaces(positionOf(3, 'spread'), 6, 'spread')).toContain(3);
    expect(anchorFor(2, 6, 'spread')).toBe(4);
    expect(anchorFor(3, 6, 'spread')).toBe(5); // last face is on the left
  });
});
