import { assistantReply, type AssistantReply } from '@/features/assistant/assistantEngine';
import type { Catalog } from '@/features/menu/catalog';
import type { Locale } from '@/types';
import { mockDelay } from '../delay';

/**
 * Assistant contract. A future LLM implementation runs on the BACKEND (API keys never reach the
 * browser), is given the catalog as its only knowledge source, and must return product ids
 * that exist in the catalog — the UI drops any id it does not know.
 */
export interface AssistantService {
  readonly provider: string;
  ask(message: string, ctx: { catalog: Catalog; locale: Locale }): Promise<AssistantReply>;
}

export function createMockAssistantService(): AssistantService {
  return {
    provider: 'mock',
    async ask(message, { catalog }) {
      await mockDelay(450);
      return assistantReply(message, catalog);
    },
  };
}
