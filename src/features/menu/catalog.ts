import type { Category, CategoryId, Cents, Locale, Product } from '@/types';
import { pickLocalized } from '@/utils/localized';

export interface Catalog {
  categories: Category[];
  products: Product[];
}

export function visibleCategories(catalog: Catalog): Category[] {
  return catalog.categories.filter((c) => !c.hidden).sort((a, b) => a.order - b.order);
}

export function findCategoryBySlug(catalog: Catalog, slug: string): Category | undefined {
  return catalog.categories.find((c) => c.slug === slug && !c.hidden);
}

export function findCategory(catalog: Catalog, id: CategoryId): Category | undefined {
  return catalog.categories.find((c) => c.id === id);
}

export function productsInCategory(catalog: Catalog, id: CategoryId): Product[] {
  return catalog.products.filter((p) => p.category === id);
}

export function findProduct(catalog: Catalog, id: string): Product | undefined {
  return catalog.products.find((p) => p.id === id);
}

export function minPrice(products: Product[]): Cents | undefined {
  const prices = products.filter((p) => p.available).map((p) => p.price);
  return prices.length ? Math.min(...prices) : undefined;
}

export function productName(product: Product, locale: Locale): string {
  return product.translations?.[locale]?.name ?? product.name;
}

export function categoryName(category: Category, locale: Locale): string {
  return pickLocalized(category.name, locale)?.text ?? category.name.lv;
}

/** Products from categories that are shown to customers. */
export function publicProducts(catalog: Catalog): Product[] {
  const visible = new Set(visibleCategories(catalog).map((c) => c.id));
  return catalog.products.filter((p) => visible.has(p.category));
}
