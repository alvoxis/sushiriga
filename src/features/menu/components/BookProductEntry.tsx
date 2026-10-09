import { Link } from 'react-router';
import { paths } from '@/app/routes';
import { Price } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Product } from '@/types';
import { cn } from '@/utils/cn';
import { productName } from '../catalog';
import { AddToCartButton } from './AddToCartButton';
import { LocalizedBlock } from './LocalizedBlock';
import { ProductMeta } from './ProductMeta';
import styles from './menu.module.css';

/** A dish as it is "printed" on a page of the menu book. */
export function BookProductEntry({
  product,
  highlighted,
}: {
  product: Product;
  highlighted?: boolean;
}) {
  const { t, locale } = useTranslation();
  return (
    <li
      className={cn(styles.entry, highlighted && styles.entryHighlighted)}
      data-highlighted={highlighted || undefined}
    >
      {highlighted && <span className="visually-hidden">{t('book.foundHere')}: </span>}
      <h3 className={styles.entryName}>
        {product.number && <span className={styles.number}>{product.number} </span>}
        <Link to={paths.product(product.id)}>{productName(product, locale)}</Link>
      </h3>
      <Price cents={product.price} className={styles.price} />
      <div className={styles.entryText}>
        <LocalizedBlock text={product.ingredients ?? product.description} as="span" />
        {product.components && !product.ingredients && (
          <span>{product.components.join(' · ')}</span>
        )}
      </div>
      <div className={styles.entryAdd}>
        <AddToCartButton product={product} size="sm" compact />
      </div>
      <div className={styles.entryMeta}>
        <ProductMeta product={product} />
      </div>
    </li>
  );
}
