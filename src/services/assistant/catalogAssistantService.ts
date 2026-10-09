import { assistantReply } from '@/features/assistant/assistantEngine';
import type { AssistantService } from './assistantService';

/**
 * The cat today: rule-based search over the real menu (no AI, no network, nothing invented).
 * Works the same with or without the backend. A future LLM implementation would run on the
 * backend behind the same interface.
 */
export function createCatalogAssistantService(): AssistantService {
  return {
    provider: 'catalog-rules',
    async ask(message, { catalog }) {
      return assistantReply(message, catalog);
    },
  };
}
