import type { AppConfig } from '../config';
import type { PaymentService } from '../payments/paymentService';
import { createId } from '@/utils/id';
import { mockDelay } from './delay';

/**
 * DEMO payment: "succeeds" without charging anything. Refuses to exist outside demo mode, so it
 * can never be mistaken for a real payment provider.
 */
export function createDemoPaymentService(config: AppConfig): PaymentService {
  if (!config.demoMode) throw new Error('Demo payments are only available in demo mode');
  return {
    provider: 'demo',
    async pay({ quoteId, amount }) {
      await mockDelay(300);
      return {
        paymentId: createId('demo-pay'),
        status: 'succeeded',
        provider: 'demo',
        quoteId,
        amount,
      };
    },
  };
}
