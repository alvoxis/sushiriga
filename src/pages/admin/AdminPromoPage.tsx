import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Card, ChoiceGroup, TextField } from '@/components/ui';
import { useAdmin } from '@/features/admin/AdminContext';
import { localDate } from '@/features/pickup/pickupSlots';
import { useTranslation } from '@/i18n';
import type { PromoCode, PromoDiscountType } from '@/types';
import { parseEuroInput } from '@/utils/money';
import { zonedTime } from '@/utils/time';
import styles from './admin.module.css';

interface Draft {
  code: string;
  type: PromoDiscountType;
  value: string;
  minOrder: string;
  expires: string;
  usageLimit: string;
  active: boolean;
}

const EMPTY: Draft = {
  code: '',
  type: 'percentage',
  value: '',
  minOrder: '',
  expires: '',
  usageLimit: '',
  active: true,
};

function toDraft(promo: PromoCode): Draft {
  return {
    code: promo.code,
    type: promo.type,
    value: promo.type === 'percentage' ? String(promo.value) : (promo.value / 100).toFixed(2),
    minOrder: promo.minOrderValue !== undefined ? (promo.minOrderValue / 100).toFixed(2) : '',
    expires: promo.expiresAt ? localDate(new Date(promo.expiresAt), 'Europe/Riga') : '',
    usageLimit: promo.usageLimit !== undefined ? String(promo.usageLimit) : '',
    active: promo.active,
  };
}

/** Builds the API payload; null when a number is not valid. */
function fromDraft(draft: Draft): Omit<PromoCode, 'usageCount'> | null {
  const value =
    draft.type === 'percentage' ? Number(draft.value) : (parseEuroInput(draft.value) ?? NaN);
  const minOrder = draft.minOrder.trim() ? parseEuroInput(draft.minOrder) : undefined;
  const limit = draft.usageLimit.trim() ? Number(draft.usageLimit) : undefined;
  if (!Number.isInteger(value) || value <= 0 || minOrder === null) return null;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) return null;
  return {
    code: draft.code.trim().toUpperCase(),
    type: draft.type,
    value,
    ...(minOrder !== undefined ? { minOrderValue: minOrder } : {}),
    // "Valid until" a date = until the end of that day in Riga (summer and winter time).
    ...(draft.expires
      ? { expiresAt: zonedTime(draft.expires, '23:59:59', 'Europe/Riga').toISOString() }
      : {}),
    ...(limit !== undefined ? { usageLimit: limit } : {}),
    active: draft.active,
    visibility: 'public',
  };
}

/** Administrators create and switch off public promo codes; the server checks every use. */
export default function AdminPromoPage() {
  const { t, locale, formatPrice } = useTranslation();
  const { admin, describeError } = useAdmin();
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    admin.promoCodes().then(
      (list) => active && setCodes(list),
      (failure: unknown) => active && setError(describeError(failure)),
    );
    return () => {
      active = false;
    };
  }, [admin, describeError]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = fromDraft(draft);
    setMessage(null);
    if (!payload) {
      setError(t('admin.promo.invalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await admin.savePromoCode(payload);
      setCodes((list) => [saved, ...(list ?? []).filter((c) => c.code !== saved.code)]);
      setMessage(t('admin.promo.saved', { code: saved.code }));
      setDraft(EMPTY);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  }

  const set = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }));
  const date = (iso: string) => new Intl.DateTimeFormat(locale).format(new Date(iso));

  return (
    <div className={styles.page}>
      <h1>{t('admin.promo.title')}</h1>
      <Card as="section" aria-labelledby="promo-form-title">
        <h2 id="promo-form-title" className={styles.cardTitle}>
          {t('admin.promo.form')}
        </h2>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <TextField
            label={t('admin.promo.code')}
            hint={t('admin.promo.codeHint')}
            value={draft.code}
            autoCapitalize="characters"
            maxLength={32}
            onChange={(e) => set({ code: e.target.value })}
            required
          />
          <ChoiceGroup<PromoDiscountType>
            legend={t('admin.promo.type')}
            value={draft.type}
            onChange={(type) => set({ type })}
            choices={[
              { value: 'percentage', label: t('admin.promo.percentage') },
              { value: 'fixed', label: t('admin.promo.fixed') },
            ]}
          />
          <TextField
            label={
              draft.type === 'percentage'
                ? t('admin.promo.valuePercent')
                : t('admin.promo.valueFixed')
            }
            inputMode="decimal"
            value={draft.value}
            onChange={(e) => set({ value: e.target.value })}
            required
          />
          <TextField
            label={t('admin.promo.minOrder')}
            inputMode="decimal"
            value={draft.minOrder}
            onChange={(e) => set({ minOrder: e.target.value })}
          />
          <TextField
            label={t('admin.promo.expires')}
            type="date"
            value={draft.expires}
            onChange={(e) => set({ expires: e.target.value })}
          />
          <TextField
            label={t('admin.promo.usageLimit')}
            inputMode="numeric"
            value={draft.usageLimit}
            onChange={(e) => set({ usageLimit: e.target.value })}
          />
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => set({ active: e.target.checked })}
            />
            <span>{t('admin.promo.active')}</span>
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <div>
            <Button type="submit" disabled={busy || !draft.code.trim() || !draft.value.trim()}>
              {t('admin.promo.save')}
            </Button>
          </div>
        </form>
      </Card>

      {codes === null ? (
        !error && <p role="status">{t('common.loading')}</p>
      ) : codes.length === 0 ? (
        <p>{t('admin.promo.empty')}</p>
      ) : (
        <ul className={styles.promoList} role="list">
          {codes.map((promo) => (
            <li key={promo.code} className={styles.promoRow}>
              <strong className={styles.code}>{promo.code}</strong>
              <span>
                {promo.type === 'percentage' ? `−${promo.value}%` : `−${formatPrice(promo.value)}`}
                {promo.minOrderValue !== undefined &&
                  ` · ${t('admin.promo.from', { amount: formatPrice(promo.minOrderValue) })}`}
                {promo.expiresAt && ` · ${t('admin.promo.until', { date: date(promo.expiresAt) })}`}
              </span>
              <span className={styles.muted}>
                {promo.usageLimit !== undefined
                  ? t('admin.promo.usesLimit', { count: promo.usageCount, limit: promo.usageLimit })
                  : t('admin.promo.uses', { count: promo.usageCount })}
              </span>
              {!promo.active && <Badge tone="outline">{t('admin.promo.inactive')}</Badge>}
              <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(promo))}>
                {t('admin.promo.edit')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
