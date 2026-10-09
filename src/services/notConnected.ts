import type { AssistantService } from './assistant/assistantService';
import { OrderError } from './orders/orderService';

/**
 * Used when VITE_API_URL is set but the backend does not offer the feature yet. These fail
 * loudly instead of silently falling back to demo data.
 */
const fail = (feature: string): never => {
  throw new OrderError('not-connected', `${feature} is not connected to the backend yet`);
};

export const notConnectedAssistant: AssistantService = {
  provider: 'none',
  ask: async () => fail('Assistant'),
};
