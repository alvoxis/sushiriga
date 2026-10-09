import type { Catalog } from '@/features/menu/catalog';
import type { Location } from '@/types';
import type { Store } from '../db/store';

/**
 * The menu comes from the repository (verbatim from sushiriga.lv, reviewed in docs/MENU_DATA.md);
 * staff-managed availability and price changes are applied on top from the database.
 */
export function createCatalogService(base: Catalog, locations: Location[], store: Store) {
  return {
    catalog(): Catalog {
      const overrides = new Map(store.overrides.list().map((o) => [o.productId, o]));
      if (!overrides.size) return base;
      return {
        categories: base.categories,
        products: base.products.map((product) => {
          const override = overrides.get(product.id);
          if (!override) return product;
          return {
            ...product,
            ...(override.available !== null ? { available: override.available } : {}),
            ...(override.price !== null ? { price: override.price } : {}),
          };
        }),
      };
    },
    hasProduct: (id: string) => base.products.some((p) => p.id === id),
    locations: () => locations,
    activeLocations: () => locations.filter((l) => l.active),
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
