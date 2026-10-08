import { useTranslation } from '@/i18n';
import type { Cents } from '@/types';

export function Price({ cents, className }: { cents: Cents; className?: string }) {
  const { formatPrice } = useTranslation();
  return <span className={className}>{formatPrice(cents)}</span>;
}
