import type { Category, Product } from '@/types';
import { publicProducts, visibleCategories, type Catalog } from './catalog';
import { normalizeSearch } from './search';

export interface MenuSearchResult {
  categories: Category[];
  products: Product[];
}

export const MAX_PRODUCT_RESULTS = 30;

/** Text a dish can be found by: its names (display, source, translated) and its menu number. */
function productNames(product: Product): string[] {
  return [
    product.name,
    product.sourceName ?? '',
    ...Object.values(product.translations ?? {}).map((t) => t.name ?? ''),
  ]
    .filter(Boolean)
    .map(normalizeSearch);
}

/**
 * 0 = name starts with the query, 1 = a word of the name starts with it, 2 = contained,
 * null = no match. Every word of the query must match somewhere in the names.
 */
function productScore(product: Product, query: string, words: string[]): number | null {
  if (product.number && words.length === 1 && words[0] === product.number) return 0;
  const names = productNames(product);
  const haystack = names.join(' ');
  if (!words.every((word) => haystack.includes(word))) return null;
  if (names.some((name) => name.startsWith(query))) return 0;
  if (names.some((name) => name.split(/[\s.\-/]+/).some((part) => part.startsWith(words[0]!)))) {
    return 1;
  }
  return 2;
}

/**
 * Search dishes by name / menu number and chapters by name in every language. Diacritics and
 * case are ignored ("kunsei", "Kunsei", "kūpināts" style input all work). Only dishes of visible
 * chapters are returned, in menu order within the same relevance.
 */
export function searchMenu(catalog: Catalog, rawQuery: string): MenuSearchResult {
  const query = normalizeSearch(rawQuery).trim().replace(/\s+/g, ' ');
  if (!query) return { categories: [], products: [] };
  const words = query.split(' ');

  const categories = visibleCategories(catalog).filter((category) => {
    const names = [...Object.values(category.name), category.slug].map(normalizeSearch);
    return words.every((word) => names.some((name) => name.includes(word)));
  });

  const scored = publicProducts(catalog)
    .map((product, index) => ({ product, index, score: productScore(product, query, words) }))
    .filter(
      (entry): entry is { product: Product; index: number; score: number } => entry.score !== null,
    )
    .sort((a, b) => a.score - b.score || a.index - b.index);

  return {
    categories,
    products: scored.slice(0, MAX_PRODUCT_RESULTS).map((entry) => entry.product),
  };
}
