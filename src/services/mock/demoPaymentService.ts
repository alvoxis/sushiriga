import type { AppConfig } from '../config';
import { PaymentError, type PaymentService } from '../payments/paymentService';

/**
 * DEMO: there is no payment at all — demo orders stay "awaiting payment" and nothing is ever
 * presented as paid. Refuses to exist outside demo mode.
 */
export function createDemoPaymentService(config: AppConfig): PaymentService {
  if (!config.demoMode) throw new Error('Demo payments are only available in demo mode');
  const unavailable = async (): Promise<never> => {
    throw new PaymentError('payments-unavailable', 'There is no payment in demo mode');
  };
  return {
    provider: 'demo',
    availability: async () => ({ available: false, reason: 'demo' }),
    start: unavailable,
    refresh: unavailable,
  };
}
