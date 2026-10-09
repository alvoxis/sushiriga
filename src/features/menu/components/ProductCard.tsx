import { Link } from 'react-router';
import { paths } from '@/app/routes';
import { ImagePlaceholder, Price } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Product } from '@/types';
import { bookTheme } from '../bookThemes';
import { productName } from '../catalog';
import { AddToCartButton } from './AddToCartButton';
import { LocalizedBlock } from './LocalizedBlock';
import { ProductMeta } from './ProductMeta';
import styles from './menu.module.css';

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useTranslation();
  const name = productName(product, locale);
  return (
    <article className={styles.card} data-testid="product-card">
      <ImagePlaceholder compact ratio="1 / 1" tone={bookTheme(product.category).cloth} />
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>
          {product.number && (
            <span className={styles.number}>{t('menu.number', { number: product.number })}</span>
          )}
          <Link to={paths.product(product.id)}>{name}</Link>
        </h3>
        <LocalizedBlock
          text={product.ingredients ?? product.description}
          className={styles.ingredients}
        />
        {product.components && !product.ingredients && (
          <p className={styles.ingredients}>{product.components.join(' · ')}</p>
        )}
        <ProductMeta product={product} />
        <div className={styles.cardFooter}>
          <Price cents={product.price} className={styles.price} />
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </article>
  );
}
