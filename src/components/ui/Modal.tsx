import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from '@/i18n';
import { Button } from './Button';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

/**
 * Accessible modal built on the native <dialog>: focus trapping, Esc to close, inert background
 * and top-layer stacking come from the browser. Renders as a bottom sheet on phones.
 */
export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useTranslation();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    // Backdrop click is a mouse convenience; keyboard users close with Esc (native) or the ✕ button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // backdrop click
      }}
    >
      {open && (
        <div className={styles.inner}>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={t('common.close')}
              onClick={onClose}
            >
              <span aria-hidden="true">✕</span>
            </Button>
          </div>
          {children}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
