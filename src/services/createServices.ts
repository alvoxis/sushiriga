import { createMockAssistantService } from './assistant/assistantService';
import { createGuestOnlyAuthService } from './auth/authService';
import { createStaticCatalogService } from './catalog/catalogService';
import { readConfig, type AppConfig } from './config';
import { createStaticLocationService } from './locations/locationService';
import { createMockOrderService } from './orders/mockOrderService';
import { createDemoPaymentService } from './payments/demoPaymentService';
import { createMockPromoService } from './promo/mockPromoService';
import { createMockReviewService } from './reviews/reviewService';
import type { Services } from './services';

/**
 * Composition root for all services. Today everything is local/mock. When the backend exists,
 * swap implementations here based on `config.apiUrl` — components never change.
 */
export function createServices(config: AppConfig = readConfig()): Services {
  if (!config.demoMode) {
    // TODO(backend): replace with HTTP implementations (createHttpClient(config.apiUrl)).
    console.warn('VITE_API_URL is set but HTTP services are not implemented yet — using mocks.');
  }
  const orders = createMockOrderService();
  return {
    config,
    catalog: createStaticCatalogService(),
    locations: createStaticLocationService(),
    orders,
    ordersAdmin: orders,
    promo: createMockPromoService(),
    payments: createDemoPaymentService(),
    auth: createGuestOnlyAuthService(),
    assistant: createMockAssistantService(),
    reviews: createMockReviewService(),
  };
}
