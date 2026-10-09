import { assistantReply } from '@/features/assistant/assistantEngine';
import type { AssistantService } from '../assistant/assistantService';
import { mockDelay } from './delay';

/** Rule-based assistant over the local catalog. No AI provider, no network. */
export function createMockAssistantService(): AssistantService {
  return {
    provider: 'mock',
    async ask(message, { catalog }) {
      await mockDelay(450);
      return assistantReply(message, catalog);
    },
  };
}
