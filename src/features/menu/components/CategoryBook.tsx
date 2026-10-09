import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths, ROUTES } from '@/app/routes';
import { Book, BookCover, BookPage } from '@/components/book';
import { ButtonLink } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Category, Product } from '@/types';
import { bookTheme, themeStyle } from '../bookThemes';
import { categoryName, minPrice } from '../catalog';
import { chunkIndexes, packPages, samePages } from '../paginate';
import { useProductsPerPage } from '../useProductsPerPage';
import { BookProductEntry } from './BookProductEntry';
import styles from './menu.module.css';

interface CategoryBookProps {
  category: Category;
  products: Product[];
  /** Neighbouring chapters, offered on the last page. */
  previous?: Category;
  next?: Category;
  /** Open the book on the page with this dish and mark it (from search / product page). */
  highlightId?: string;
}

/**
 * One category = one book: cover → chapter page → dish pages → closing page.
 * Dishes are laid out by their MEASURED height in a hidden page-sized ruler, so a page never
 * cuts a dish — whatever the language, font or screen. Without layout (tests, very first frame)
 * a fixed number per page is used.
 */
export function CategoryBook({
  category,
  products,
  previous,
  next,
  highlightId,
}: CategoryBookProps) {
  const { t, locale, formatPrice } = useTranslation();
  const name = categoryName(category, locale);
  const from = minPrice(products);
  const theme = bookTheme(category.id);
  const perPage = useProductsPerPage();

  const ruler = useRef<HTMLUListElement>(null);
  const [measured, setMeasured] = useState<number[][] | null>(null);

  useLayoutEffect(() => {
    const list = ruler.current;
    const body = list?.parentElement; // the page body of the ruler page
    if (!list || !body) return;
    const measure = () => {
      const available = body.clientHeight;
      if (!available) return; // no layout (e.g. jsdom) → keep the fallback
      const heights = [...list.children].map((item) => item.getBoundingClientRect().height);
      const pages = packPages(heights, available);
      setMeasured((current) => (current && samePages(current, pages) ? current : pages));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [products, locale]);

  const layout = measured ?? chunkIndexes(products.length, perPage);
  // Faces: 0 cover, 1 chapter page, 2… dish pages.
  const highlightIndex = highlightId ? products.findIndex((p) => p.id === highlightId) : -1;
  const highlightPage = layout.findIndex((page) => page.includes(highlightIndex));
  const openFace = highlightPage >= 0 ? 2 + highlightPage : undefined;

  const dishPages = layout.map((indexes, page) => (
    <BookPage key={`dishes-${page}`} heading={name} folio={page + 2}>
      <ul className={styles.entries} role="list">
        {indexes.map((index) => {
          const product = products[index]!;
          return (
            <BookProductEntry
              key={product.id}
              product={product}
              highlighted={product.id === highlightId}
            />
          );
        })}
      </ul>
    </BookPage>
  ));

  const pages = [
    <BookPage key="chapter" heading={name} folio={1}>
      <div className={styles.chapter}>
        <p className="eyebrow">{t('book.contents')}</p>
        <h2 className={styles.chapterTitle}>{name}</h2>
        <span className={styles.chapterRule} aria-hidden="true" />
        <p className={styles.chapterFacts}>
          {t('book.itemsCount', { count: products.length })}
          {from !== undefined && <> · {t('book.fromPrice', { price: formatPrice(from) })}</>}
        </p>
      </div>
    </BookPage>,
    ...dishPages,
    <BookPage key="end" variant="endpaper">
      <div className={styles.chapter}>
        <h2 className={styles.endTitle}>{t('book.endTitle')}</h2>
        {next && (
          <ButtonLink to={paths.category(next.slug)} size="sm">
            {t('book.nextChapter', { name: categoryName(next, locale) })}
          </ButtonLink>
        )}
        <ul className={styles.endLinks} role="list">
          <li>
            <Link to={ROUTES.cart}>{t('nav.cart')}</Link>
          </li>
          {previous && (
            <li>
              <Link to={paths.category(previous.slug)}>
                {t('book.previousChapter', { name: categoryName(previous, locale) })}
              </Link>
            </li>
          )}
          <li>
            <Link to={ROUTES.menu}>{t('book.allChapters')}</Link>
          </li>
        </ul>
      </div>
    </BookPage>,
  ];

  return (
    <Book
      title={name}
      style={themeStyle(theme)}
      {...(openFace !== undefined ? { initialFace: openFace, openFace } : {})}
      cover={
        <BookCover
          title={name}
          subtitle={t('book.itemsCount', { count: products.length })}
          pattern={theme.pattern}
          openLabel={t('book.open')}
        />
      }
      pages={pages}
      measure={
        <BookPage heading={name} folio={2}>
          <ul ref={ruler} className={styles.entries} role="list">
            {products.map((product) => (
              <BookProductEntry key={product.id} product={product} />
            ))}
          </ul>
        </BookPage>
      }
    />
  );
}
