import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className={styles.title}>{title}</h1>
      {lead && <p className={styles.lead}>{lead}</p>}
      {children}
    </header>
  );
}
