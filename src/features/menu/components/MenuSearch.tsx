import { useEffect, useId, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { paths } from '@/app/routes';
import { Icon, Price } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { bookTheme, themeStyle } from '../bookThemes';
import { categoryName, findCategory, productName } from '../catalog';
import { useCatalog } from '../CatalogContext';
import { searchMenu } from '../searchMenu';
import { AddToCartButton } from './AddToCartButton';
import styles from './MenuSearch.module.css';

export const MENU_SEARCH_ID = 'menu-search';

/**
 * Live search over dish names, menu numbers and chapter names (all languages). The query lives
 * in the URL (?q=…) so results survive navigation and can be shared; every dish result can open
 * its chapter's book directly on the dish's page.
 */
export function MenuSearch() {
  const { t, locale } = useTranslation();
  const catalog = useCatalog();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const input = useRef<HTMLInputElement>(null);
  const statusId = useId();

  // /menu#menu-search (header search icon) focuses the field.
  useEffect(() => {
    if (location.hash === `#${MENU_SEARCH_ID}`) input.current?.focus();
  }, [location.hash]);

  const result = searchMenu(catalog, query);
  const count = result.categories.length + result.products.length;

  function update(value: string) {
    setParams(value ? { q: value } : {}, { replace: true, preventScrollReset: true });
  }

  return (
    <section className={styles.search} aria-label={t('search.label')}>
      <form role="search" className={styles.field} onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={MENU_SEARCH_ID} className="visually-hidden">
          {t('search.label')}
        </label>
        <Icon name="search" className={styles.icon} />
        <input
          id={MENU_SEARCH_ID}
          ref={input}
          type="search"
          value={query}
          onChange={(event) => update(event.target.value)}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={query ? statusId : undefined}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => update('')}
            aria-label={t('search.clear')}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </form>

      {query && (
        <div className={styles.results}>
          <p id={statusId} className={styles.status} role="status">
            {count ? t('search.results', { count }) : t('search.none')}
          </p>

          {result.categories.length > 0 && (
            <div>
              <h2 className={styles.heading}>{t('search.chapters')}</h2>
              <ul className={styles.chapters} role="list">
                {result.categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      to={paths.category(category.slug)}
                      className={styles.chapter}
                      style={themeStyle(bookTheme(category.id))}
                    >
                      {categoryName(category, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.products.length > 0 && (
            <div>
              <h2 className={styles.heading}>{t('search.dishes')}</h2>
              <ul className={styles.dishes} role="list">
                {result.products.map((product) => {
                  const category = findCategory(catalog, product.category);
                  const name = productName(product, locale);
                  const chapter = category ? categoryName(category, locale) : '';
                  return (
                    <li key={product.id} className={styles.dish} data-testid="search-result">
                      <div className={styles.dishText}>
                        <Link to={paths.product(product.id)} className={styles.dishName}>
                          {product.number && (
                            <span className={styles.number}>{product.number} </span>
                          )}
                          {name}
                        </Link>
                        <span className={styles.meta}>
                          {chapter} · <Price cents={product.price} />
                        </span>
                      </div>
                      <div className={styles.actions}>
                        {category && (
                          <Link
                            to={paths.dishInBook(category.slug, product.id)}
                            className={styles.inBook}
                            aria-label={t('search.openInBookLabel', { name, chapter })}
                          >
                            <Icon name="book" size={18} />
                            {t('search.openInBook')}
                          </Link>
                        )}
                        <AddToCartButton product={product} size="sm" compact />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
