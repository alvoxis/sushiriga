import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '@/app/routes';
import { Button, Card, ChoiceGroup, TextField } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { canOrderAsap, pickupSlots } from '@/features/pickup/pickupSlots';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { TipSelector } from '@/features/tips/components/TipSelector';
import { tipAmount } from '@/features/tips/tips';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import { OrderError } from '@/services/orders/orderService';
import type { GuestContact, Location, TipSelection } from '@/types';
import { validateContact, type ContactErrors } from '../validateContact';
import styles from './checkout.module.css';

type TimeMode = 'asap' | 'scheduled';

/**
 * Guest checkout: Pickup → Contact → Give a smile → Payment → Order.
 * No account is required at any step.
 */
export function CheckoutForm({ locations }: { locations: Location[] }) {
  const { t, locale, formatPrice } = useTranslation();
  const navigate = useNavigate();
  const services = useServices();
  const { cart, items, clear, setPromo } = useCart();

  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const location = locations.find((l) => l.id === locationId);
  // Standard estimate only — staff choose the final time after the paid order arrives.
  const preparation = STANDARD_PREPARATION_MINUTES;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const slots = useMemo(
    () => (location ? pickupSlots(location, now, preparation) : []),
    [location, now, preparation],
  );
  const asapAvailable = location ? canOrderAsap(location, now, preparation) : false;

  const [timeMode, setTimeMode] = useState<TimeMode>(asapAvailable ? 'asap' : 'scheduled');
  const [slot, setSlot] = useState('');
  const [contact, setContact] = useState<GuestContact>({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [timeError, setTimeError] = useState(false);
  const [tip, setTip] = useState<TipSelection>({ kind: 'none' });
  const [submitting, setSubmitting] = useState(false);
  const [tipError, setTipError] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: location?.timeZone,
  });
  const tipCents = tipAmount(tip);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const contactErrors = validateContact(contact);
    const pickupTime = timeMode === 'asap' && asapAvailable ? 'asap' : slot;
    const tipInvalid = tip.kind === 'custom' && tipCents === 0;
    setErrors(contactErrors);
    setTimeError(!pickupTime);
    setTipError(tipInvalid);
    if (
      Object.keys(contactErrors).length ||
      !pickupTime ||
      tipInvalid ||
      !location ||
      !cart.items.length
    ) {
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      // 1. The server prices the cart. Only ids, quantities, promo code and tip are sent.
      const quote = await services.orders.quote({
        customer: {
          type: 'guest',
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          ...(contact.email?.trim() ? { email: contact.email.trim() } : {}),
        },
        items: items.filter((item) => cart.items.some((line) => line.productId === item.productId)),
        ...(cart.promoCode ? { promoCode: cart.promoCode } : {}),
        tip: tipCents,
        locationId: location.id,
        pickupTime,
      });
      if (quote.promoRejected) {
        setPromo(null);
        setFailure(t(`cart.promo.errors.${quote.promoRejected}`, { amount: '' }));
        setSubmitting(false);
        return;
      }
      // The customer must never pay an amount different from the one they saw.
      if (quote.total !== cart.total + tipCents) {
        setFailure(t('checkout.priceChanged', { total: formatPrice(quote.total) }));
        setSubmitting(false);
        return;
      }
      // 2. Payment for the server quote (demo mode: simulated, nothing is charged).
      const payment = await services.payments.pay({
        quoteId: quote.quoteId,
        amount: quote.total,
        description: 'SUSHIRIGA pickup order',
      });
      if (payment.status !== 'succeeded') throw new Error('payment failed');
      // 3. The order exists only once the payment is confirmed.
      const order = await services.orders.awaitPaidOrder(quote.quoteId, payment);
      clear();
      navigate(paths.order(order.id));
    } catch (error) {
      setFailure(
        error instanceof OrderError && error.code === 'unavailable-product'
          ? t('checkout.unavailableProduct')
          : t('checkout.failed'),
      );
      setSubmitting(false);
    }
  }

  const contactError = (field: keyof GuestContact) => {
    const code = errors[field];
    return code ? { error: t(`checkout.errors.${code}`) } : {};
  };

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <p className={styles.note}>{t('checkout.guestNote')}</p>

        <section className={styles.step} aria-labelledby="step-pickup">
          <h2 id="step-pickup" className={styles.stepTitle}>
            <span className={styles.stepNumber}>01</span>
            {t('checkout.steps.pickup')}
          </h2>
          {/* Single location today; the same control lists Location 2 once it is active. */}
          <ChoiceGroup
            legend={t('checkout.location')}
            value={locationId}
            onChange={setLocationId}
            choices={locations.map((l) => ({
              value: l.id,
              label: `${l.name} · ${l.address.street}`,
            }))}
          />
          <ChoiceGroup<TimeMode>
            legend={t('checkout.pickupTime')}
            value={timeMode}
            onChange={setTimeMode}
            choices={[
              ...(asapAvailable
                ? [{ value: 'asap' as const, label: t('checkout.asap', { minutes: preparation }) }]
                : []),
              { value: 'scheduled', label: t('checkout.scheduled') },
            ]}
          />
          {(timeMode === 'scheduled' || !asapAvailable) &&
            (slots.length ? (
              <label className="stack" style={{ gap: 'var(--space-1)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  {t('checkout.chooseTime')}
                </span>
                <select
                  className={styles.select}
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  aria-invalid={timeError || undefined}
                >
                  <option value="">—</option>
                  {slots.map((s) => (
                    <option key={s.toISOString()} value={s.toISOString()}>
                      {timeFormat.format(s)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className={styles.error}>{t('checkout.noSlots')}</p>
            ))}
          {timeError && <p className={styles.error}>{t('checkout.errors.time')}</p>}
          <p className={styles.note}>
            {t('checkout.prepNote', { minutes: STANDARD_PREPARATION_MINUTES })}
          </p>
        </section>

        <section className={styles.step} aria-labelledby="step-contact">
          <h2 id="step-contact" className={styles.stepTitle}>
            <span className={styles.stepNumber}>02</span>
            {t('checkout.steps.contact')}
          </h2>
          <TextField
            label={t('checkout.name')}
            autoComplete="name"
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            required
            {...contactError('name')}
          />
          <TextField
            label={t('checkout.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            hint={t('checkout.phoneHint')}
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            required
            {...contactError('phone')}
          />
          <TextField
            label={t('checkout.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            hint={t('checkout.emailHint')}
            value={contact.email ?? ''}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            {...contactError('email')}
          />
        </section>

        <section className={styles.step} aria-label={t('checkout.steps.tip')}>
          <TipSelector value={tip} onChange={setTip} />
          {tipError && <p className={styles.error}>{t('tips.invalid')}</p>}
        </section>

        <section className={styles.step} aria-labelledby="step-payment">
          <h2 id="step-payment" className={styles.stepTitle}>
            <span className={styles.stepNumber}>04</span>
            {t('checkout.steps.payment')}
          </h2>
          <div className={styles.payment}>
            <p>{t('checkout.paymentNotConnected')}</p>
            {services.config.demoMode && <p>{t('checkout.paymentDemo')}</p>}
          </div>
          {failure && (
            <p className={styles.error} role="alert">
              {failure}
            </p>
          )}
          <div>
            <Button type="submit" size="lg" disabled={submitting || !services.config.demoMode}>
              {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
            </Button>
          </div>
        </section>
      </form>

      <aside className={styles.aside} aria-label={t('checkout.summary')}>
        <Card>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}>
            {t('checkout.summary')}
          </h2>
          <CartSummary cart={cart} tip={tipCents} />
        </Card>
      </aside>
    </div>
  );
}
