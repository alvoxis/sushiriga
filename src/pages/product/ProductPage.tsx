import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths, ROUTES } from '@/app/routes';
import { ButtonLink, ImagePlaceholder, PageHeader, Price } from '@/components/ui';
import { bookTheme } from '@/features/menu/bookThemes';
import { QuantityStepper } from '@/features/cart/components/QuantityStepper';
import { categoryName, findCategory, findProduct, productName } from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { AddToCartButton } from '@/features/menu/components/AddToCartButton';
import { AllergenNotice } from '@/features/menu/components/AllergenNotice';
import { LocalizedBlock } from '@/features/menu/components/LocalizedBlock';
import { ProductMeta } from '@/features/menu/components/ProductMeta';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import styles from '../menu/menu.module.css';

export default function ProductPage() {
  const { id = '' } = useParams();
  const { t, locale } = useTranslation();
  const catalog = useCatalog();
  const product = findProduct(catalog, id);
  const category = product ? findCategory(catalog, product.category) : undefined;
  const [quantity, setQuantity] = useState(1);
  useDocumentTitle(product ? productName(product, locale) : t('menu.productNotFound'));

  if (!product || !category || category.hidden) {
    return (
      <div className="container">
        <PageHeader title={t('menu.productNotFound')} />
        <ButtonLink to={ROUTES.menu}>{t('menu.backToMenu')}</ButtonLink>
      </div>
    );
  }

  const name = productName(product, locale);
  const catName = categoryName(category, locale);

  return (
    <div className="container">
      <nav className={styles.breadcrumbs} aria-label={t('menu.breadcrumbs')}>
        <ol>
          <li>
            <Link to={ROUTES.menu}>{t('menu.title')}</Link>
          </li>
          <li>
            <Link to={paths.category(category.slug)}>{catName}</Link>
          </li>
          <li aria-current="page">{name}</li>
        </ol>
      </nav>
      <article className={styles.product}>
        <ImagePlaceholder
          label={t('menu.photoSoon')}
          ratio="16 / 10"
          tone={bookTheme(category.id).cloth}
        />
        <div className={styles.productInfo}>
          {product.number && (
            <p className="eyebrow">{t('menu.number', { number: product.number })}</p>
          )}
          <h1 className={styles.productTitle}>{name}</h1>
          <Price cents={product.price} className={styles.productPrice} />
          <ProductMeta product={product} />

          {product.ingredients && (
            <section className={styles.productSection}>
              <h2>{t('menu.ingredients')}</h2>
              <LocalizedBlock text={product.ingredients} />
            </section>
          )}
          {product.description && (
            <section className={styles.productSection}>
              <h2>{t('menu.description')}</h2>
              <LocalizedBlock text={product.description} />
            </section>
          )}
          {product.components && (
            <section className={styles.productSection}>
              <h2>{t('menu.components')}</h2>
              <ul className={styles.components}>
                {product.components.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          <div className={styles.buy}>
            <QuantityStepper
              value={quantity}
              min={1}
              onChange={setQuantity}
              decreaseLabel={t('cart.decrease', { name })}
              increaseLabel={t('cart.increase', { name })}
              valueLabel={t('menu.quantity')}
            />
            <AddToCartButton product={product} quantity={quantity} size="lg" />
          </div>
          <AllergenNotice category={category} />
        </div>
      </article>
    </div>
  );
}
