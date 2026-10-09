import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';
import { createApp } from './app';
import type { ServerConfig } from './config';
import { openDatabase } from './db/database';
import { createStore } from './db/store';
import { createOrderTokens } from './security/tokens';
import { createCatalogService } from './services/catalog';
import { createOrderService } from './services/orders';
import { createReviewService } from './services/reviews';

/** Wires database, services and HTTP app together. Used by main.ts and by the tests. */
export function createServerContext(config: ServerConfig, now: () => Date = () => new Date()) {
  const db = openDatabase(config.databasePath);
  const store = createStore(db);
  const catalog = createCatalogService({ categories, products }, locations, store);
  const orders = createOrderService({
    store,
    catalog,
    tokens: createOrderTokens(config.orderTokenSecret),
    now,
  });
  const reviews = createReviewService(store, now);
  const app = createApp({ config, store, catalog, orders, reviews, now });
  return { db, store, catalog, orders, reviews, app };
}

export type ServerContext = ReturnType<typeof createServerContext>;
