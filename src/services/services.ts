import type { AdminService } from './admin/adminService';
import type { AssistantService } from './assistant/assistantService';
import type { AuthService } from './auth/authService';
import type { CatalogService } from './catalog/catalogService';
import type { AppConfig } from './config';
import type { LocationService } from './locations/locationService';
import type { OrderAdminService, OrderService } from './orders/orderService';
import type { PaymentService } from './payments/paymentService';
import type { PromoService } from './promo/promoService';
import type { ReviewService } from './reviews/reviewService';

export interface Services {
  config: AppConfig;
  catalog: CatalogService;
  locations: LocationService;
  orders: OrderService;
  /** Demo only: lets the order page simulate staff actions. Undefined with a real backend. */
  ordersAdmin?: OrderAdminService;
  promo: PromoService;
  payments: PaymentService;
  auth: AuthService;
  assistant: AssistantService;
  reviews: ReviewService;
  /** Restaurant admin panel. Only with a backend — demo mode has no staff accounts. */
  admin?: AdminService;
}
