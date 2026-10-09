import { categories, products } from '@/data/menu';
import { locations } from '@/data/locations';
import { createGuestOnlyAuthService } from './auth/authService';
import { createStaticCatalogService } from './catalog/catalogService';
import { readConfig, type AppConfig } from './config';
import { createHttpClient } from './http/httpClient';
import {
  createHttpCatalogService,
  createHttpLocationService,
  createHttpOrderService,
  createHttpPaymentService,
  createHttpPromoService,
  createHttpReviewService,
} from './http/httpServices';
import { createStaticLocationService } from './locations/locationService';
import { createDemoPaymentService } from './mock/demoPaymentService';
import { createMockAssistantService } from './mock/mockAssistantService';
import { createMockOrderService } from './mock/mockOrderService';
import { createMockPromoService } from './mock/mockPromoService';
import { createMockReviewService } from './mock/mockReviewService';
import { notConnectedAssistant } from './notConnected';
import type { Services } from './services';

/**
 * Composition root — the ONLY production file allowed to import `./mock/*` (enforced by ESLint).
 *
 * - Demo mode (no VITE_API_URL): everything runs locally on mock services.
 * - Backend configured: the real API (`server/`) for menu, locations, orders, payments, promo
 *   codes and reviews. Features the backend does not offer yet stay "not connected" and fail
 *   loudly — there is no silent demo fallback.
 */
export function createServices(config: AppConfig = readConfig()): Services {
  const auth = createGuestOnlyAuthService();

  if (config.apiUrl && !config.demoMode) {
    const http = createHttpClient(config.apiUrl);
    return {
      config,
      auth,
      catalog: createHttpCatalogService(http, { categories, products }),
      locations: createHttpLocationService(http, locations),
      orders: createHttpOrderService(http),
      promo: createHttpPromoService(http),
      reviews: createHttpReviewService(http),
      payments: createHttpPaymentService(http),
      assistant: notConnectedAssistant,
    };
  }

  const orders = createMockOrderService({ products, locations });
  return {
    config,
    auth,
    catalog: createStaticCatalogService({ categories, products }),
    locations: createStaticLocationService(locations),
    orders,
    ordersAdmin: orders,
    // Test codes only, clearly labelled as such in the UI — never presented as a server check.
    promo: createMockPromoService(),
    payments: createDemoPaymentService(config),
    assistant: createMockAssistantService(),
    reviews: createMockReviewService(),
  };
}
