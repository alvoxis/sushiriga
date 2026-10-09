import { Link } from 'react-router';
import { paths, ROUTES } from '@/app/routes';
import { Book, BookCover, BookPage } from '@/components/book';
import { ButtonLink } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Category, Product } from '@/types';
import { bookTheme, themeStyle } from '../bookThemes';
import { useProductsPerPage } from '../useProductsPerPage';
import { categoryName, minPrice } from '../catalog';
import { AllergenNotice } from './AllergenNotice';
import { BookProductEntry } from './BookProductEntry';
import styles from './menu.module.css';

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

interface CategoryBookProps {
  category: Category;
  products: Product[];
  /** Neighbouring chapters, offered on the last page. */
  previous?: Category;
  next?: Category;
}

/** One category = one book: cover → chapter page → dish pages → closing page. */
export function CategoryBook({ category, products, previous, next }: CategoryBookProps) {
  const { t, locale, formatPrice } = useTranslation();
  const name = categoryName(category, locale);
  const from = minPrice(products);
  const theme = bookTheme(category.id);
  const perPage = useProductsPerPage();

  const pages = (() => {
    const dishPages = chunk(products, perPage).map((group, index) => (
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
          {next && (
            <ButtonLink to={paths.category(next.slug)}>
              {t('book.nextChapter', { name: categoryName(next, locale) })}
            </ButtonLink>
          )}
          <ButtonLink to={ROUTES.cart} variant="secondary">
            {t('nav.cart')}
          </ButtonLink>
          {previous && (
            <Link to={paths.category(previous.slug)}>
              {t('book.previousChapter', { name: categoryName(previous, locale) })}
            </Link>
          )}
          <Link to={ROUTES.menu}>{t('menu.backToMenu')}</Link>
        </div>
      </BookPage>,
    ];
  })();

  return (
    <Book
      title={name}
      style={themeStyle(theme)}
      cover={
        <BookCover
          title={name}
          subtitle={t('book.itemsCount', { count: products.length })}
          pattern={theme.pattern}
          openLabel={t('book.open')}
        />
      }
      pages={pages}
    />
  );
}
