import { useEffect, useRef, useState } from 'react';
import { NavLink, useParams } from 'react-router';
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
          value={view}
          onChange={(next) => {
            setView(next);
            writeStorage(VIEW_KEY, next);
          }}
          choices={[
            { value: 'book', label: t('book.viewAsBook') },
            { value: 'list', label: t('book.viewAsList') },
          ]}
        />
      </div>
      {view === 'book' ? (
        // key: a fresh book (closed, on the cover) for every category
        <CategoryBook
          key={category.id}
          category={category}
          products={products}
          {...(previous ? { previous } : {})}
          {...(next ? { next } : {})}
        />
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
