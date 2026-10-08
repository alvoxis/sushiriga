import { Link } from 'react-router';
import { paths, ROUTES } from '@/app/routes';
import { ButtonLink, PlaceholderPanel } from '@/components/ui';
import { locations } from '@/data/locations';
import { AssistantTeaser } from '@/features/assistant/components/AssistantTeaser';
import {
  categoryName,
  minPrice,
  productsInCategory,
  visibleCategories,
} from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { MenuBook } from '@/features/menu/components/MenuBook';
import { LocationCard } from '@/features/pickup/components/LocationCard';
import { useDocumentTitle } from '@/hooks';
import { useTranslation } from '@/i18n';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { t, locale, formatPrice } = useTranslation();
  const catalog = useCatalog();
  useDocumentTitle(undefined);
  const chapters = visibleCategories(catalog);
  const activeLocations = locations.filter((l) => l.active);

  return (
    <>
      <section className={`container ${styles.hero}`} aria-labelledby="home-title">
        <div>
          <div className={styles.rule} aria-hidden="true" />
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 id="home-title" className={styles.title}>
            {t('home.title')}
          </h1>
          <p className={styles.lead}>{t('home.lead')}</p>
          <div className={styles.ctas}>
            <ButtonLink to={ROUTES.menu} size="lg">
              {t('home.openMenu')}
            </ButtonLink>
            <ButtonLink to={ROUTES.menu} size="lg" variant="secondary">
              {t('home.orderNow')}
            </ButtonLink>
          </div>
          <div className={styles.assistant}>
            <AssistantTeaser />
          </div>
        </div>
        <MenuBook />
      </section>

      {/* TODO(data): "popular" needs real order statistics — until then all chapters are shown in menu order. */}
      <section className={`container ${styles.section}`} aria-labelledby="home-chapters">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="home-chapters" className={styles.sectionTitle}>
              {t('home.categoriesTitle')}
            </h2>
            <p className={styles.sectionLead}>{t('home.categoriesLead')}</p>
          </div>
          <Link to={ROUTES.menu}>{t('home.browseAll')} →</Link>
        </div>
        <ul className={styles.chapters} role="list">
          {chapters.map((category) => {
            const products = productsInCategory(catalog, category.id);
            const from = minPrice(products);
            return (
              <li key={category.id}>
                <Link to={paths.category(category.slug)} className={styles.chapter}>
                  <span className={styles.chapterName}>{categoryName(category, locale)}</span>
                  <span className={styles.chapterMeta}>
                    {t('book.itemsCount', { count: products.length })}
                    {from !== undefined && (
                      <> · {t('book.fromPrice', { price: formatPrice(from) })}</>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="home-reviews">
        <div className={styles.sectionHeader}>
          <h2 id="home-reviews" className={styles.sectionTitle}>
            {t('home.reviewsTitle')}
          </h2>
          <Link to={ROUTES.reviews}>{t('nav.reviews')} →</Link>
        </div>
        <PlaceholderPanel title={t('reviews.empty')}>{t('home.reviewsEmpty')}</PlaceholderPanel>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="home-visit">
        <div className={styles.sectionHeader}>
          <h2 id="home-visit" className={styles.sectionTitle}>
            {t('home.aboutTitle')}
          </h2>
          <Link to={ROUTES.pickup}>{t('nav.pickup')} →</Link>
        </div>
        <div className={styles.visit}>
          {activeLocations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
          <div className="stack">
            <h3 className={styles.sectionTitle}>{t('home.assistantTitle')}</h3>
            <p className={styles.sectionLead}>{t('home.assistantLead')}</p>
            <div>
              <ButtonLink to={ROUTES.assistant} variant="secondary">
                {t('home.assistantCta')}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
