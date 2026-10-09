import { useMemo } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/routes';
import { Book, BookCover, BookPage, useBookControls } from '@/components/book';
import { ButtonLink } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { Category } from '@/types';
import { MENU_BOOK_THEME, themeStyle } from '../bookThemes';
import {
  categoryName,
  minPrice,
  productName,
  productsInCategory,
  visibleCategories,
} from '../catalog';
import { useCatalog } from '../CatalogContext';
import styles from './menu.module.css';

/** Contents entry that turns the book to the chapter page (face index = 2 + position). */
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

/** The home-page book: the whole menu, one page per chapter. */
export function MenuBook() {
  const catalog = useCatalog();
  const { t, locale, formatPrice } = useTranslation();
  const chapters = visibleCategories(catalog);

  const pages = useMemo(
    () => [
      <BookPage key="contents" heading={t('book.contents')} folio={1}>
        <h2 className="visually-hidden">{t('book.contents')}</h2>
        <ul className={styles.contents} role="list">
          {chapters.map((category, index) => (
            <ContentsEntry key={category.id} category={category} face={index + 2} />
          ))}
        </ul>
      </BookPage>,
      ...chapters.map((category, index) => {
        const products = productsInCategory(catalog, category.id);
        const from = minPrice(products);
        const name = categoryName(category, locale);
        return (
          <BookPage key={category.id} heading={name} folio={index + 2}>
            <div className={styles.chapter}>
              <h2 className={styles.chapterTitle}>{name}</h2>
              <span className={styles.chapterRule} aria-hidden="true" />
              <p className={styles.chapterFacts}>
                {t('book.itemsCount', { count: products.length })}
                {from !== undefined && <> · {t('book.fromPrice', { price: formatPrice(from) })}</>}
              </p>
              <ul className={styles.chapterFacts} role="list">
                {products.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link to={paths.product(p.id)}>{productName(p, locale)}</Link>
                  </li>
                ))}
              </ul>
              <div>
                <ButtonLink to={paths.category(category.slug)}>
                  {t('book.openCategory', { name })}
                </ButtonLink>
              </div>
            </div>
          </BookPage>
        );
      }),
    ],
    [catalog, chapters, formatPrice, locale, t],
  );

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
    />
  );
}
