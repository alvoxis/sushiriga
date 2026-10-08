import { Link } from 'react-router';
import { paths } from '@/app/routes';
import { Price } from '@/components/ui';
import { categoryName, findCategory, productName } from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { AddToCartButton } from '@/features/menu/components/AddToCartButton';
import { useTranslation } from '@/i18n';
import type { Product } from '@/types';
import styles from './assistant.module.css';

/** A recommendation card. All facts come from the catalog product — never from the assistant. */
export function AssistantRecommendation({ product }: { product: Product }) {
  const catalog = useCatalog();
  const { locale } = useTranslation();
  const category = findCategory(catalog, product.category);
  return (
    <li className={styles.recommendation} data-testid="assistant-recommendation">
      <div>
        <p className={styles.recommendationName}>
          <Link to={paths.product(product.id)}>{productName(product, locale)}</Link>
        </p>
        <p className={styles.recommendationMeta}>
          {category && categoryName(category, locale)} · <Price cents={product.price} />
        </p>
      </div>
      <AddToCartButton product={product} size="sm" compact />
    </li>
  );
}
