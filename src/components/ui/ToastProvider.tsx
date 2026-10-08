import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ToastContext, type ToastApi, type ToastMessage, type ToastTone } from './ToastContext';
import styles from './Toast.module.css';

const DURATION = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const show = useCallback((text: string, tone: ToastTone = 'neutral') => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DURATION);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Always mounted so screen readers announce new messages. */}
      <div className={styles.viewport} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(styles.toast, toast.tone !== 'neutral' && styles[toast.tone])}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
