import { useMemo } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Book, BookCover, BookPage } from '@/components/book';
import { ButtonLink } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Category, Product } from '@/types';
import { categoryName, minPrice } from '../catalog';
import { AllergenNotice } from './AllergenNotice';
import { BookProductEntry } from './BookProductEntry';
import styles from './menu.module.css';

export const PRODUCTS_PER_PAGE = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** One category = one book: cover → chapter page → dish pages → closing page. */
export function CategoryBook({ category, products }: { category: Category; products: Product[] }) {
  const { t, locale, formatPrice } = useTranslation();
  const name = categoryName(category, locale);
  const from = minPrice(products);

  const pages = useMemo(() => {
    const dishPages = chunk(products, PRODUCTS_PER_PAGE).map((group, index) => (
      <BookPage key={`dishes-${index}`} heading={name} folio={index + 2}>
        <ul className={styles.entries} role="list">
          {group.map((product) => (
            <BookProductEntry key={product.id} product={product} />
          ))}
        </ul>
      </BookPage>
    ));
    return [
      <BookPage key="chapter" heading={name} folio={1}>
        <div className={styles.chapter}>
          <p className="eyebrow">{t('book.contents')}</p>
          <h2 className={styles.chapterTitle}>{name}</h2>
          <span className={styles.chapterRule} aria-hidden="true" />
          <p className={styles.chapterFacts}>
            {t('book.itemsCount', { count: products.length })}
            {from !== undefined && <> · {t('book.fromPrice', { price: formatPrice(from) })}</>}
          </p>
          <AllergenNotice category={category} />
        </div>
      </BookPage>,
      ...dishPages,
      <BookPage key="end" variant="endpaper">
        <div className={styles.chapter}>
          <h2 className={styles.chapterTitle}>{t('book.endTitle')}</h2>
          <p className={styles.chapterFacts}>{t('book.endBody')}</p>
          <ButtonLink to={ROUTES.cart}>{t('nav.cart')}</ButtonLink>
          <Link to={ROUTES.menu}>{t('menu.backToMenu')}</Link>
        </div>
      </BookPage>,
    ];
  }, [category, formatPrice, from, name, products, t]);

  return (
    <Book
      title={name}
      cover={
        <BookCover
          title={name}
          subtitle={t('book.itemsCount', { count: products.length })}
          footer={<span>{t('book.coverSubtitle')}</span>}
        />
      }
      pages={pages}
    />
  );
}
