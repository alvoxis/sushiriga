import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';
import { createApp } from './app';
import type { ServerConfig } from './config';
import { openDatabase } from './db/database';
import { createStore } from './db/store';
import { createStripeGateway, type PaymentGateway } from './payments/gateway';
import { createOrderTokens } from './security/tokens';
import { createCatalogService } from './services/catalog';
import { createOrderService } from './services/orders';
import { createPaymentService } from './services/payments';
import { createReviewService } from './services/reviews';

/** Wires database, services and HTTP app together. Used by main.ts and by the tests. */
export function createServerContext(
  config: ServerConfig,
  now: () => Date = () => new Date(),
  /** Tests can replace the payment provider; production uses Stripe when keys are set. */
  gateway: PaymentGateway | null = config.stripe ? createStripeGateway(config.stripe) : null,
) {
  const db = openDatabase(config.databasePath);
  const store = createStore(db);
  const catalog = createCatalogService({ categories, products }, locations, store);
  const orders = createOrderService({
    store,
    catalog,
    tokens: createOrderTokens(config.orderTokenSecret),
    now,
  });
  const payments = createPaymentService({ store, catalog, gateway, now });
  const reviews = createReviewService(store, now);
  const app = createApp({ config, store, catalog, orders, payments, reviews, now });
  return { db, store, catalog, orders, payments, reviews, app };
}

export type ServerContext = ReturnType<typeof createServerContext>;
