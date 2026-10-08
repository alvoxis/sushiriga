import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';
import type { Weekday } from '@/types';

describe('menu data integrity', () => {
  it('shows the 12 project categories plus Poke, in source order', () => {
    const visible = categories.filter((c) => !c.hidden).map((c) => c.name.lv);
    expect(visible).toEqual([
      'Sushi Burger',
      'Poke',
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

  it('has 99 products, 4 of them poke', () => {
    expect(products).toHaveLength(99);
    expect(products.filter((p) => p.category === 'poke')).toHaveLength(4);
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

  it('does not invent dietary or allergen data (unknown = undefined)', () => {
    for (const product of products) {
      expect(product.spicy).toBeUndefined();
      expect(product.vegetarian).toBeUndefined();
      expect(product.allergens).toBeUndefined();
    }
  });

  it('keeps the verbatim source name of every product', () => {
    for (const product of products) expect(product.sourceName).toBeTruthy();
    expect(products.find((p) => p.id === 'french-fries-230g')?.sourceName).toBe(
      'Copy of French fries 230 g',
    );
  });

  it('every category has products', () => {
    for (const category of categories) {
      expect(products.some((p) => p.category === category.id)).toBe(true);
    }
  });
});

describe('locations', () => {
  it('has exactly one active location for now (multi-location ready)', () => {
    expect(locations.filter((l) => l.active)).toHaveLength(1);
  });

  it('uses the confirmed address and opening hours, and no unconfirmed phone', () => {
    const [location] = locations;
    expect(location?.address).toMatchObject({
      street: 'Latgales iela 250A',
      city: 'Rīga',
      postalCode: 'LV-1063',
    });
    expect(location?.phone).toBeUndefined();
    const hours = (day: Weekday) => location?.openingHours[day];
    for (const day of [0, 1, 2, 3, 4] as const) {
      expect(hours(day)).toEqual([{ opens: '11:00', closes: '22:00' }]);
    }
    for (const day of [5, 6] as const) {
      expect(hours(day)).toEqual([{ opens: '11:00', closes: '23:30' }]);
    }
  });
});
