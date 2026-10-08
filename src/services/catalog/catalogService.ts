import { categories, products } from '@/data/menu';
import type { Catalog } from '@/features/menu/catalog';

export interface CatalogService {
  /** The whole public catalog. Later: GET /catalog (cached, with ETag). */
  getCatalog(): Promise<Catalog>;
}

/** Catalog bundled with the app (src/data). Used until the backend owns the menu. */
export function createStaticCatalogService(
  catalog: Catalog = { categories, products },
): CatalogService {
  return { getCatalog: async () => catalog };
}

export const staticCatalog: Catalog = { categories, products };
