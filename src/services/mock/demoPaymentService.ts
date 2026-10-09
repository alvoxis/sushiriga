import { createId } from '@/utils/id';
import { mockDelay } from '../delay';
import type { PaymentService } from './paymentService';

/** DEMO: always "succeeds" without charging anything. Never used when a backend is configured. */
export function createDemoPaymentService(): PaymentService {
  return {
    provider: 'demo',
    async pay() {
      await mockDelay(300);
      return { paymentId: createId('demo-pay'), status: 'succeeded', provider: 'demo' };
    },
  };
}
