export type AssistantRole = 'assistant' | 'user';

export interface AssistantMessageData {
  id: string;
  role: AssistantRole;
  text: string;
  /** Product ids from the catalog. The assistant may only recommend existing products. */
  recommendations?: string[];
}

export type AssistantMood = 'idle' | 'thinking' | 'talking' | 'happy';
