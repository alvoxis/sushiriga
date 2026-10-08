import type { ReactNode } from 'react';
import type { AssistantRole } from '@/types';
import { cn } from '@/utils/cn';
import styles from './assistant.module.css';

export function AssistantMessage({ role, children }: { role: AssistantRole; children: ReactNode }) {
  return (
    <li
      className={cn(
        styles.message,
        role === 'assistant' ? styles.assistantMessage : styles.userMessage,
      )}
      data-role={role}
    >
      {children}
    </li>
  );
}
