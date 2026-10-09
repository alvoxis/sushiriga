import { useEffect, useState } from 'react';
import { Button, TextField } from '@/components/ui';
import { useAdmin } from '@/features/admin/AdminContext';
import { categoryName, productName, visibleCategories } from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { useTranslation } from '@/i18n';
import type { AdminProduct } from '@/types';
import { parseEuroInput } from '@/utils/money';
import styles from './admin.module.css';

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function ProductRow({
  item,
  onSaved,
}: {
  item: AdminProduct;
  onSaved: (item: AdminProduct) => void;
}) {
  const { t, locale, formatPrice } = useTranslation();
  const { admin, user, describeError } = useAdmin();
  const [price, setPrice] = useState((item.product.price / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = productName(item.product, locale);

  async function save(change: { available?: boolean | null; price?: number | null }) {
    setBusy(true);
    setError(null);
    try {
      const saved = await admin.setProduct(item.product.id, change);
      setPrice((saved.product.price / 100).toFixed(2));
      onSaved(saved);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  }

  const cents = parseEuroInput(price);
  return (
    <li className={styles.menuRow} data-available={item.product.available}>
      <div className={styles.checkbox}>
        <input
          id={`available-${item.product.id}`}
          type="checkbox"
          checked={item.product.available}
          disabled={busy}
          aria-label={`${name} — ${t('admin.menu.available')}`}
          onChange={(e) => void save({ available: e.target.checked })}
        />
        <span>
          <strong>{name}</strong>
          <span className={styles.muted}> · {t('admin.menu.available')}</span>
        </span>
      </div>
      <span className={styles.muted}>
        {t('admin.menu.basePrice', { price: formatPrice(item.basePrice) })}
      </span>
      {user.role === 'admin' ? (
        <div className={styles.priceEditor}>
          <TextField
            label={t('admin.menu.price')}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            {...(cents === null ? { error: t('admin.menu.invalidPrice') } : {})}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || cents === null || cents === item.product.price}
            onClick={() => void save({ price: cents })}
          >
            {t('admin.menu.savePrice')}
          </Button>
          {item.priceOverride !== null && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void save({ price: null })}
            >
              {t('admin.menu.resetPrice')}
            </Button>
          )}
        </div>
      ) : (
        <span>{formatPrice(item.product.price)}</span>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

/** Staff mark dishes as sold out; administrators can also change prices. */
export default function AdminMenuPage() {
  const { t, locale } = useTranslation();
  const { admin, user, describeError } = useAdmin();
  const catalog = useCatalog();
  const [items, setItems] = useState<AdminProduct[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    admin.menu().then(
      (list) => active && setItems(list),
      (failure: unknown) => active && setError(describeError(failure)),
    );
    return () => {
      active = false;
    };
  }, [admin, describeError]);

  const q = normalize(query.trim());
  const matches = (item: AdminProduct) =>
    !q || normalize(productName(item.product, locale)).includes(q);

  return (
    <div className={styles.page}>
      <h1>{t('admin.menu.title')}</h1>
      {user.role !== 'admin' && <p className={styles.muted}>{t('admin.menu.priceAdminOnly')}</p>}
      <TextField
        label={t('admin.menu.search')}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {items === null
        ? !error && <p role="status">{t('common.loading')}</p>
        : visibleCategories(catalog).map((category) => {
            const inCategory = items.filter(
              (item) => item.product.category === category.id && matches(item),
            );
            if (!inCategory.length) return null;
            return (
              <section key={category.id} className={styles.menuSection}>
                <h2>{categoryName(category, locale)}</h2>
                <ul className={styles.menuList} role="list">
                  {inCategory.map((item) => (
                    <ProductRow
                      key={item.product.id}
                      item={item}
                      onSaved={(saved) =>
                        setItems((list) =>
                          (list ?? []).map((i) => (i.product.id === saved.product.id ? saved : i)),
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}
    </div>
  );
}
