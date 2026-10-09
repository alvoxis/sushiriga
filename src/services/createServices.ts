import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';
import { createGuestOnlyAuthService } from './auth/authService';
import { createStaticCatalogService } from './catalog/catalogService';
import { readConfig, type AppConfig } from './config';
import { createStaticLocationService } from './locations/locationService';
import { createDemoPaymentService } from './mock/demoPaymentService';
import { createMockAssistantService } from './mock/mockAssistantService';
import { createMockOrderService } from './mock/mockOrderService';
import { createMockReviewService } from './mock/mockReviewService';
import {
  notConnectedAssistant,
  notConnectedOrders,
  notConnectedPayments,
  notConnectedPromo,
  notConnectedReviews,
} from './notConnected';
import { unavailablePromoService } from './promo/unavailablePromoService';
import type { Services } from './services';

/**
 * Composition root — the ONLY production file allowed to import `./mock/*` (enforced by ESLint).
 *
 * - Demo mode (no VITE_API_URL): everything runs locally on mock services.
 * - Backend configured: catalog/locations still come from bundled data, everything else is
 *   "not connected" until HTTP implementations exist (TODO(backend)). No silent demo fallback.
 */
export function createServices(config: AppConfig = readConfig()): Services {
  const shared = {
    config,
    catalog: createStaticCatalogService({ categories, products }),
    locations: createStaticLocationService(locations),
    auth: createGuestOnlyAuthService(),
  };

  if (!config.demoMode) {
    return {
      ...shared,
      orders: notConnectedOrders,
      promo: notConnectedPromo,
      payments: notConnectedPayments,
      assistant: notConnectedAssistant,
      reviews: notConnectedReviews,
    };
  }

  const orders = createMockOrderService({ products, locations });
  return {
    ...shared,
    orders,
    ordersAdmin: orders,
    // No server to check codes yet → no simulated discounts (mock codes exist for tests only).
    promo: unavailablePromoService,
    payments: createDemoPaymentService(config),
    assistant: createMockAssistantService(),
    reviews: createMockReviewService(),
  };
}
