/**
 * Guards the catalog against silent loss or edits: every dish of the source menu snapshot
 * (scripts/menu-import/source-snapshot.json, extracted from sushiriga.lv) must exist with the
 * same name, category, price and texts. Confirmed corrections must update the snapshot test too.
 */
import source from '../../../scripts/menu-import/source-snapshot.json';
import type { CategoryId, Product } from '@/types';
import { products } from './products';

const SECTION_TO_CATEGORY: Record<string, CategoryId> = {
  'SUSHI BURGER': 'sushi-burger',
  poke: 'poke',
  'NIGIRI & GUNKAN': 'nigiri-gunkan',
  HOSOMAKI: 'hosomaki',
  ROLLI: 'rolli',
  'CEPTI ROLLI': 'cepti-rolli',
  TEMPURA: 'tempura',
  'DOUBLE MIX 1+1': 'double-mix',
  SPECIAL: 'special',
  'SUSHI SETI': 'sushi-seti',
  DZĒRIENI: 'dzerieni',
  Snacks: 'snacks',
  SOUSES: 'sauces',
};

interface SourceItem {
  name: string;
  description: string | null;
  price: string;
}

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();
const sections = (source as { section: string; items: SourceItem[] }[]).filter(
  (s) => s.items.length,
);

function textsOf(product: Product): string[] {
  const texts = [
    ...Object.values(product.ingredients ?? {}),
    ...Object.values(product.description ?? {}),
    ...Object.values(product.translations ?? {}).map((t) => t.name ?? ''),
  ];
  for (const component of product.components ?? []) texts.push(...component.split(' — '));
  return texts.filter(Boolean).map(norm);
}

describe('catalog vs source snapshot', () => {
  it('maps every source section to a category', () => {
    for (const section of sections) expect(SECTION_TO_CATEGORY[section.section]).toBeDefined();
  });

  it('has the same number of dishes per category', () => {
    for (const section of sections) {
      const category = SECTION_TO_CATEGORY[section.section];
      expect(products.filter((p) => p.category === category)).toHaveLength(section.items.length);
    }
    expect(products).toHaveLength(sections.reduce((sum, s) => sum + s.items.length, 0));
  });

  it.each(sections.flatMap((s) => s.items.map((item) => [s.section, item] as const)))(
    '%s: %o is kept with its price and texts',
    (section, item) => {
      const product = products.find((p) => p.sourceName === item.name.trim());
      expect(product, `missing: ${item.name}`).toBeDefined();
      expect(product!.category).toBe(SECTION_TO_CATEGORY[section]);
      expect(product!.price).toBe(Math.round(Number(item.price.replace('€', '')) * 100));
      const original = norm(item.description ?? '');
      for (const text of textsOf(product!)) expect(original).toContain(text);
    },
  );
});
