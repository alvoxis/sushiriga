import type { AssistantService } from './assistant/assistantService';
import { OrderError, type OrderService } from './orders/orderService';
import type { PaymentService } from './payments/paymentService';
import type { PromoService } from './promo/promoService';
import type { ReviewService } from './reviews/reviewService';

/**
 * Used when VITE_API_URL is set but the HTTP integration does not exist yet. These fail loudly
 * instead of silently falling back to demo data — a configured production build must never
 * take demo payments or keep orders in the browser.
 */
const fail = (feature: string): never => {
  throw new OrderError('not-connected', `${feature} is not connected to the backend yet`);
};

export const notConnectedOrders: OrderService = {
  quote: async () => fail('Orders'),
  awaitPaidOrder: async () => fail('Orders'),
  getOrder: async () => fail('Orders'),
  listCustomerOrders: async () => fail('Orders'),
};

export const notConnectedPayments: PaymentService = {
  provider: 'stripe',
  pay: async () => fail('Payments'),
};

export const notConnectedPromo: PromoService = { validate: async () => fail('Promo codes') };

export const notConnectedReviews: ReviewService = {
  submit: async () => fail('Reviews'),
  listPublished: async () => [],
  getForOrder: async () => undefined,
};

export const notConnectedAssistant: AssistantService = {
  provider: 'none',
  ask: async () => fail('Assistant'),
};
