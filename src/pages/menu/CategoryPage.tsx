import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router';
import { paths, ROUTES } from '@/app/routes';
import { ButtonLink, ChoiceGroup, PageHeader } from '@/components/ui';
import {
  categoryName,
  findCategoryBySlug,
  productsInCategory,
  visibleCategories,
} from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { AllergenNotice } from '@/features/menu/components/AllergenNotice';
import { CategoryBook } from '@/features/menu/components/CategoryBook';
import { ProductCard } from '@/features/menu/components/ProductCard';
import cardStyles from '@/features/menu/components/menu.module.css';
import { bookTheme, themeStyle } from '@/features/menu/bookThemes';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import { readStorage, writeStorage } from '@/utils/storage';
import styles from './menu.module.css';

type View = 'book' | 'list';
const VIEW_KEY = 'menu.view';

export default function CategoryPage() {
  const { category: slug = '' } = useParams();
  const { t, locale } = useTranslation();
  const catalog = useCatalog();
  const category = findCategoryBySlug(catalog, slug);
  const chapters = visibleCategories(catalog);
  const activeChip = useRef<HTMLAnchorElement>(null);
  // Keep the current chapter visible in the horizontally scrolling chapter list.
  useEffect(() => {
    activeChip.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [slug]);
  const [view, setView] = useState<View>(() =>
    readStorage<View>(VIEW_KEY, 'book') === 'list' ? 'list' : 'book',
  );
  useDocumentTitle(category ? categoryName(category, locale) : t('menu.categoryNotFound'));

  // ?dish=<id> (from search or a product page) opens the book on the page with that dish.
  const [params, setParams] = useSearchParams();
  const dishParam = params.get('dish');
  const dish =
    category && dishParam
      ? catalog.products.find((p) => p.id === dishParam && p.category === category.id)
      : undefined;
  // A requested dish is always shown in its book page, whatever view was chosen before.
  const shownView: View = dish ? 'book' : view;
  const bookRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dish) bookRef.current?.scrollIntoView?.({ block: 'start' });
  }, [dish]);

  if (!category) {
    return (
      <div className="container">
        <PageHeader title={t('menu.categoryNotFound')} />
        <ButtonLink to={ROUTES.menu}>{t('menu.backToMenu')}</ButtonLink>
      </div>
    );
  }

  const products = productsInCategory(catalog, category.id);
  const index = chapters.findIndex((c) => c.id === category.id);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const name = categoryName(category, locale);

  return (
    <div className="container">
      <p className={styles.backLink}>
        <Link to={ROUTES.menu}>← {t('book.allChapters')}</Link>
      </p>
      <PageHeader title={name} lead={t('book.itemsCount', { count: products.length })} />
      <nav className={styles.categoryNav} aria-label={t('menu.shelfLabel')}>
        {chapters.map((c) => (
          <NavLink
            key={c.id}
            to={paths.category(c.slug)}
            style={themeStyle(bookTheme(c.id))}
            ref={c.id === category.id ? activeChip : undefined}
          >
            <span className={styles.chipDot} aria-hidden="true" />
            {categoryName(c, locale)}
          </NavLink>
        ))}
      </nav>
      <div className={styles.toolbar}>
        <ChoiceGroup<View>
          legend={t('book.viewMode')}
          legendHidden
          value={shownView}
          onChange={(next) => {
            setView(next);
            writeStorage(VIEW_KEY, next);
            if (dish) setParams({}, { replace: true }); // the user picked a view explicitly
          }}
          choices={[
            { value: 'book', label: t('book.viewAsBook') },
            { value: 'list', label: t('book.viewAsList') },
          ]}
        />
      </div>
      {shownView === 'book' ? (
        <div ref={bookRef} className={styles.bookAnchor}>
          {/* key: a fresh book (closed on the cover, or open at the requested dish) */}
          <CategoryBook
            key={`${category.id}:${dish?.id ?? ''}`}
            category={category}
            products={products}
            {...(dish ? { highlightId: dish.id } : {})}
            {...(previous ? { previous } : {})}
            {...(next ? { next } : {})}
          />
        </div>
      ) : (
        <ul className={cardStyles.list} role="list" aria-label={name}>
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
      <div className={styles.notice}>
        <AllergenNotice category={category} />
      </div>
    </div>
  );
}
