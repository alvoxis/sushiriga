import { paths } from '@/app/routes';
import { BookSpine } from '@/components/book';
import { PageHeader } from '@/components/ui';
import { categoryName, productsInCategory, visibleCategories } from '@/features/menu/catalog';
import { bookTheme } from '@/features/menu/bookThemes';
import { useCatalog } from '@/features/menu/CatalogContext';
import { AllergenNotice } from '@/features/menu/components/AllergenNotice';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import styles from './menu.module.css';

export default function MenuPage() {
  const { t, locale } = useTranslation();
  const catalog = useCatalog();
  useDocumentTitle(t('menu.title'));
  const chapters = visibleCategories(catalog);

  return (
    <div className="container">
      <PageHeader title={t('menu.title')} lead={t('menu.lead')} />
      <nav aria-label={t('menu.shelfLabel')}>
        <ul className={styles.shelf} role="list">
          {chapters.map((category, index) => {
            const name = categoryName(category, locale);
            const count = productsInCategory(catalog, category.id).length;
            return (
              <li key={category.id}>
                <BookSpine
                  to={paths.category(category.slug)}
                  title={name}
                  label={String(count)}
                  ariaLabel={`${name}, ${t('book.itemsCount', { count })}`}
                  color={bookTheme(category.id).cloth}
                  height={`${13 + ((index * 7) % 4)}rem`}
                />
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={styles.notice}>
        <AllergenNotice />
      </div>
    </div>
  );
}
