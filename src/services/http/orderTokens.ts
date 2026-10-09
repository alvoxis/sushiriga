import { readStorage, writeStorage } from '@/utils/storage';

const KEY = 'order-tokens.v1';
const MAX_KEPT = 50;

/**
 * Guest orders have no account: the backend returns an access token when the order is placed,
 * and this browser keeps it to show the order status and to leave a review later.
 * Losing it (cleared storage, another device) only hides the order page — never the order.
 */
export const orderTokens = {
  get(orderId: string): string | null {
    return readStorage<Record<string, string>>(KEY, {})[orderId] ?? null;
  },
  set(orderId: string, token: string): void {
    const tokens = readStorage<Record<string, string>>(KEY, {});
    delete tokens[orderId];
    const kept = Object.entries(tokens).slice(-(MAX_KEPT - 1));
    writeStorage(KEY, Object.fromEntries([...kept, [orderId, token]]));
  },
};
