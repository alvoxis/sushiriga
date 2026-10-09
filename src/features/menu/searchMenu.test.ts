import { staticCatalog } from '@/services/catalog/catalogService';
import { MAX_PRODUCT_RESULTS, searchMenu } from './searchMenu';

const names = (query: string) => searchMenu(staticCatalog, query).products.map((p) => p.name);
const chapters = (query: string) => searchMenu(staticCatalog, query).categories.map((c) => c.id);

describe('menu search (real catalog)', () => {
  it('finds dishes by name, case-insensitively, best matches first', () => {
    expect(names('kunsei')).toEqual(['Kunsei Maki', 'Kunsei Philadelfia']);
    expect(names('PHILADEL')[0]).toMatch(/^Philadel/);
  });

  it('finds dishes by their verbatim source name and by menu number', () => {
    expect(names('salomon')).toContain('Salomon Burger');
    expect(names('31')).toEqual(['Philadelfia Classic']);
  });

  it('requires every word to match', () => {
    expect(names('kanagawa 1+1')).toEqual(['Kanagawa 1+1']);
    expect(names('poke shrimp')).toEqual(['Poke Shrimp']);
  });

  it('finds Latvian water names, ignoring diacritics', () => {
    expect(names('mineraludens')).toEqual(['Sparkling Mineral Water', 'Mineral Water Still']);
  });

  it('finds chapters in every language (incl. Poke)', () => {
    expect(chapters('poke')).toEqual(['poke']);
    expect(chapters('роллы')).toEqual(['rolli', 'cepti-rolli']);
    expect(chapters('dzerieni')).toEqual(['dzerieni']);
    expect(chapters('drinks')).toEqual(['dzerieni']);
    expect(chapters('souces')).toEqual(['sauces']);
  });

  it('returns nothing for an empty query or an unknown dish', () => {
    expect(searchMenu(staticCatalog, '   ')).toEqual({ categories: [], products: [] });
    expect(searchMenu(staticCatalog, 'pizza margherita')).toEqual({ categories: [], products: [] });
  });

  it('caps the number of dish results', () => {
    expect(searchMenu(staticCatalog, 'a').products.length).toBeLessThanOrEqual(MAX_PRODUCT_RESULTS);
  });
});
