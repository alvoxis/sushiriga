import { useState, type FormEvent } from 'react';
import { Button, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import { useCart } from '../CartContext';
import styles from './cart.module.css';

export function PromoCodeForm() {
  const { t, formatPrice } = useTranslation();
  const { promo: promoService } = useServices();
  const { cart, promo, setPromo } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError(t('cart.promo.errors.empty'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await promoService.validate(code, { subtotal: cart.subtotal });
      if (result.valid) {
        setPromo({ code: result.code, discount: result.discount });
        setCode('');
      } else {
        setError(
          t(`cart.promo.errors.${result.reason}`, {
            amount: result.minOrderValue !== undefined ? formatPrice(result.minOrderValue) : '',
          }),
        );
      }
    } catch {
      setError(t('cart.promo.errors.network'));
    } finally {
      setPending(false);
    }
  }

  // Without a server check there is nothing honest to apply: show the field disabled and say why.
  const mock = promoService.mode === 'mock';

  if (promoService.mode === 'unavailable') {
    return (
      <div className={styles.promo}>
        <TextField
          label={t('cart.promo.label')}
          value=""
          disabled
          readOnly
          hint={t('cart.promo.unavailableHint')}
        />
      </div>
    );
  }

  if (promo) {
    return (
      <div className={styles.promoApplied} role="status" data-mock={mock || undefined}>
        <span>
          {mock
            ? t('cart.promo.appliedMock', { code: promo.code })
            : t('cart.promo.applied', { code: promo.code })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setPromo(null)}>
          {t('cart.promo.remove')}
        </Button>
      </div>
    );
  }

  return (
    <form className={styles.promo} onSubmit={onSubmit} noValidate>
      <div className={styles.promoRow}>
        <TextField
          label={t('cart.promo.label')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          {...(mock ? { hint: t('cart.promo.mockNote') } : {})}
          {...(error ? { error } : {})}
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t('cart.promo.checking') : t('cart.promo.apply')}
        </Button>
      </div>
    </form>
  );
}
