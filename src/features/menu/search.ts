import type { Product } from '@/types';
import { LOCALES } from '@/types';

/** Lower-cases and strips Latvian diacritics so "lasis", "Lasis" and "lāsis" match. */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** All searchable text of a product in all languages. */
export function productSearchText(product: Product): string {
  const parts: string[] = [product.name, ...(product.components ?? [])];
  for (const locale of LOCALES) {
    parts.push(product.ingredients?.[locale] ?? '', product.description?.[locale] ?? '');
    parts.push(product.translations?.[locale]?.name ?? '');
  }
  return normalizeSearch(parts.join(' '));
}

/** Products whose text contains ANY of the given terms (terms are already normalized). */
export function productsMatchingAny(products: Product[], terms: string[]): Product[] {
  return products.filter((p) => {
    const text = productSearchText(p);
    return terms.some((term) => text.includes(term));
  });
}
