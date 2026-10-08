import { Badge } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Product } from '@/types';

/** Facts printed on the source menu: pieces, weight, volume and labels. Nothing is inferred. */
export function ProductMeta({ product }: { product: Product }) {
  const { t } = useTranslation();
  const facts = [
    product.pieces !== undefined && t('menu.pieces', { count: product.pieces }),
    product.weight !== undefined && t('menu.weight', { grams: product.weight }),
    product.volume !== undefined && t('menu.volume', { ml: product.volume }),
  ].filter(Boolean) as string[];

  if (!facts.length && !product.tags?.length) return null;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {facts.map((fact) => (
        <Badge key={fact}>{fact}</Badge>
      ))}
      {product.tags?.map((tag) => (
        <Badge
          key={tag}
          tone={
            tag === 'hot'
              ? 'accent'
              : tag === 'featured'
                ? 'indigo'
                : tag === 'warm'
                  ? 'matcha'
                  : 'neutral'
          }
        >
          {t(`menu.tags.${tag}`)}
        </Badge>
      ))}
    </span>
  );
}
