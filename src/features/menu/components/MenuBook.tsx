import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/routes';
import { Book, BookCover, BookPage, useBookControls } from '@/components/book';
import { ButtonLink } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Category } from '@/types';
import { cn } from '@/utils/cn';
import { MENU_BOOK_THEME, themeStyle } from '../bookThemes';
import {
  categoryName,
  minPrice,
  productName,
  productsInCategory,
  visibleCategories,
} from '../catalog';
import { useCatalog } from '../CatalogContext';
import { packPages, samePages } from '../paginate';
import styles from './menu.module.css';

/** Contents entry that turns the book to the chapter page. */
function ContentsEntry({ category, face }: { category: Category; face: number }) {
  const controls = useBookControls();
  const { locale } = useTranslation();
  return (
    <li>
      <button type="button" onClick={() => controls?.goToFace(face)}>
        {categoryName(category, locale)}
      </button>
      <span className={styles.folio}>{face}</span>
    </li>
  );
}

/** The home-page book: contents (as many pages as needed), then one page per chapter. */
export function MenuBook() {
  const catalog = useCatalog();
  const { t, locale, formatPrice } = useTranslation();
  const chapters = visibleCategories(catalog);

  // The contents list is paginated by measured height (hidden ruler), like the chapter books.
  const ruler = useRef<HTMLUListElement>(null);
  const [measured, setMeasured] = useState<number[][] | null>(null);
  useLayoutEffect(() => {
    const list = ruler.current;
    const body = list?.parentElement;
    if (!list || !body) return;
    const measure = () => {
      const available = body.clientHeight - (list.offsetTop - body.offsetTop);
      if (!available || available < 0) return;
      const heights = [...list.children].map((item) => item.getBoundingClientRect().height);
      const pages = packPages(heights, available);
      setMeasured((current) => (current && samePages(current, pages) ? current : pages));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [chapters.length, locale]);

  const contents = measured ?? [chapters.map((_, i) => i)];
  const firstChapterFace = 1 + contents.length;

  const pages = [
    ...contents.map((indexes, page) => (
      <BookPage key={`contents-${page}`} heading={t('book.contents')} folio={page + 1}>
        {page === 0 && <h2 className="visually-hidden">{t('book.contents')}</h2>}
        <ul className={styles.contents} role="list">
          {indexes.map((index) => (
            <ContentsEntry
              key={chapters[index]!.id}
              category={chapters[index]!}
              face={firstChapterFace + index}
            />
          ))}
        </ul>
      </BookPage>
    )),
    ...chapters.map((category, index) => {
      const products = productsInCategory(catalog, category.id);
      const from = minPrice(products);
      const name = categoryName(category, locale);
      return (
        <BookPage key={category.id} heading={name} folio={firstChapterFace + index}>
          <div className={styles.chapter}>
            <h2 className={styles.chapterTitle}>{name}</h2>
            <span className={styles.chapterRule} aria-hidden="true" />
            <p className={styles.chapterFacts}>
              {t('book.itemsCount', { count: products.length })}
              {from !== undefined && <> · {t('book.fromPrice', { price: formatPrice(from) })}</>}
            </p>
            {/* A taste of the chapter — hidden on small pages, where the button is enough. */}
            <ul className={cn(styles.chapterFacts, styles.chapterDishes)} role="list">
              {products.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <Link to={paths.product(p.id)}>{productName(p, locale)}</Link>
                </li>
              ))}
            </ul>
            <div>
              <ButtonLink to={paths.category(category.slug)} size="sm">
                {t('book.openCategory', { name })}
              </ButtonLink>
            </div>
          </div>
        </BookPage>
      );
    }),
  ];

  return (
    <Book
      title={t('book.menuTitle')}
      style={themeStyle(MENU_BOOK_THEME)}
      cover={
        <BookCover
          title="SUSHIRIGA"
          eyebrow={t('book.coverSubtitle')}
          subtitle={t('book.menuTitle')}
          pattern={MENU_BOOK_THEME.pattern}
          openLabel={t('book.open')}
          footer={<span>Rīga</span>}
        />
      }
      pages={pages}
      measure={
        <BookPage heading={t('book.contents')} folio={1}>
          <ul ref={ruler} className={styles.contents} role="list">
            {chapters.map((category) => (
              <li key={category.id}>
                <button type="button" tabIndex={-1}>
                  {categoryName(category, locale)}
                </button>
                <span className={styles.folio}>00</span>
              </li>
            ))}
          </ul>
        </BookPage>
      }
    />
  );
}
