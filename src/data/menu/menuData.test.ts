import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';

describe('menu data integrity', () => {
  it('contains the 12 project categories (plus the hidden poke section)', () => {
    const visible = categories.filter((c) => !c.hidden).map((c) => c.name.lv);
    expect(visible).toEqual([
      'Sushi Burger',
      'Nigiri & Gunkan',
      'Hosomaki',
      'Rolli',
      'Cepti Rolli',
      'Tempura',
      'Double Mix 1+1',
      'Special',
      'Sushi Seti',
      'Dzērieni',
      'Snacks',
      'Souces',
    ]);
  });

  it('has unique ids and slugs', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(categories.map((c) => c.slug)).size).toBe(categories.length);
  });

  it('only uses known categories, integer cent prices and no images yet', () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const product of products) {
      expect(ids.has(product.category)).toBe(true);
      expect(Number.isInteger(product.price) && product.price > 0).toBe(true);
      expect(product.image).toBeUndefined();
    }
  });

  it('does not invent dietary flags', () => {
    expect(
      products.some((p) => p.spicy !== undefined || p.vegetarian !== undefined || p.allergens),
    ).toBe(false);
  });

  it('every category has products', () => {
    for (const category of categories) {
      expect(products.some((p) => p.category === category.id)).toBe(true);
    }
  });

  it('has exactly one active location for now (multi-location ready)', () => {
    expect(Array.isArray(locations)).toBe(true);
    expect(locations.filter((l) => l.active)).toHaveLength(1);
  });
});
