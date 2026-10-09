import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '@/app/routes';
import { Badge, Button, Card, ChoiceGroup, TextField } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { CartSummary } from '@/features/cart/components/CartSummary';
import {
  canOrderAsap,
  checkPickupTime,
  pickupSlots,
  type PickupTimeProblem,
} from '@/features/pickup/pickupSlots';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { TipSelector } from '@/features/tips/components/TipSelector';
import { tipAmount } from '@/features/tips/tips';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import { OrderError } from '@/services/orders/orderService';
import type { CheckoutQuote, GuestContact, Location, TipSelection } from '@/types';
import { normalizeContact, validateContact, type ContactErrors } from '../validateContact';
import { OrderReview } from './OrderReview';
import styles from './checkout.module.css';

type TimeMode = 'asap' | 'scheduled';
type Step = 'details' | 'review';

/**
 * Guest checkout in two steps — no account at any point:
 * 1. Details: pickup location & time, contact, optional tip → "Review order" (server quote).
 * 2. Review: everything at a glance → "Confirm" creates the order as PENDING_PAYMENT.
 * Payments are not connected, so nothing is ever presented as paid.
 */
export function CheckoutForm({ locations }: { locations: Location[] }) {
  const { t, locale, formatPrice } = useTranslation();
  const navigate = useNavigate();
  const services = useServices();
  const { cart, items, clear, setPromo } = useCart();

  const [step, setStep] = useState<Step>('details');
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);

  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const location = locations.find((l) => l.id === locationId);
  // Standard estimate only — staff choose the final time after the order arrives.
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
  const canPickUpToday = asapAvailable || slots.length > 0;

  const [timeMode, setTimeMode] = useState<TimeMode>(asapAvailable ? 'asap' : 'scheduled');
  const [slot, setSlot] = useState('');
  const [contact, setContact] = useState<GuestContact>({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [timeProblem, setTimeProblem] = useState<PickupTimeProblem | null>(null);
  const [tip, setTip] = useState<TipSelection>({ kind: 'none' });
  const [tipError, setTipError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const detailsTop = useRef<HTMLFormElement>(null);

  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // 24-hour clock in every language (Riga)
    timeZone: location?.timeZone,
  });
  const tipCents = tipAmount(tip);
  const pickupTime = timeMode === 'asap' && asapAvailable ? 'asap' : slot;

  useEffect(() => {
    if (step === 'review') reviewHeading.current?.focus();
  }, [step]);

  /** Validate everything the customer entered; returns true when the details are complete. */
  function validateDetails(at: Date): boolean {
    const contactErrors = validateContact(contact);
    const problem = location
      ? checkPickupTime(location, at, preparation, pickupTime)
      : 'unavailable';
    const tipInvalid = tip.kind === 'custom' && tipCents === 0;
    setErrors(contactErrors);
    setTimeProblem(problem);
    setTipError(tipInvalid);
    return (
      !Object.keys(contactErrors).length &&
      !problem &&
      !tipInvalid &&
      !!location &&
      cart.items.length > 0
    );
  }

  async function onReview(event: FormEvent) {
    event.preventDefault();
    const at = new Date();
    setNow(at);
    if (!validateDetails(at) || !location) return;
    setBusy(true);
    setFailure(null);
    try {
      // The server prices the cart. Only ids, quantities, promo code and tip are sent.
      const priced = await services.orders.quote({
        customer: { type: 'guest', ...normalizeContact(contact) },
        items: items.filter((item) => cart.items.some((line) => line.productId === item.productId)),
        ...(cart.promoCode ? { promoCode: cart.promoCode } : {}),
        tip: tipCents,
        locationId: location.id,
        pickupTime,
      });
      if (priced.promoRejected) {
        setPromo(null);
        setFailure(t(`cart.promo.errors.${priced.promoRejected}`, { amount: '' }));
        return;
      }
      // Never show the customer a different amount than the one in their cart.
      if (priced.total !== cart.total + tipCents) {
        setFailure(t('checkout.priceChanged', { total: formatPrice(priced.total) }));
        return;
      }
      setQuote(priced);
      setStep('review');
      window.scrollTo?.({ top: 0 });
    } catch (error) {
      if (error instanceof OrderError && error.code === 'pickup-unavailable') {
        // The server's clock disagrees with the form (e.g. the slot has just passed).
        setTimeProblem('unavailable');
        setSlot('');
        setNow(new Date());
      } else {
        setFailure(failureMessage(error));
      }
    } finally {
      setBusy(false);
    }
  }

  function failureMessage(error: unknown): string {
    if (!(error instanceof OrderError)) return t('checkout.failed');
    switch (error.code) {
      case 'unavailable-product':
        return t('checkout.unavailableProduct');
      case 'network':
        return t('checkout.network');
      case 'too-many-requests':
        return t('checkout.tooManyRequests');
      case 'quote-not-found':
        return t('checkout.quoteExpired');
      default:
        return t('checkout.failed');
    }
  }

  async function onConfirm() {
    if (!quote || !location) return;
    // The review page may have been open for a while: the chosen time must still be possible.
    const at = new Date();
    const problem = checkPickupTime(location, at, preparation, pickupTime);
    if (problem) {
      setNow(at);
      setTimeProblem(problem);
      setSlot('');
      setStep('details');
      detailsTop.current?.scrollIntoView?.();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      // Creates the order as PENDING_PAYMENT — no payment is taken or simulated.
      const order = await services.orders.placeOrder(quote.quoteId);
      clear();
      navigate(paths.order(order.id));
    } catch (error) {
      setBusy(false);
      if (
        error instanceof OrderError &&
        (error.code === 'pickup-unavailable' || error.code === 'quote-not-found')
      ) {
        // Back to the details: a new time must be chosen / the order priced again.
        if (error.code === 'pickup-unavailable') {
          setTimeProblem('unavailable');
          setSlot('');
          setNow(new Date());
        } else {
          setFailure(t('checkout.quoteExpired'));
        }
        setQuote(null);
        setStep('details');
        return;
      }
      setFailure(failureMessage(error));
    }
  }

  const contactError = (field: keyof GuestContact) => {
    const code = errors[field];
    return code ? { error: t(`checkout.errors.${code}`) } : {};
  };
  const timeErrorText =
    timeProblem === 'missing'
      ? t('checkout.errors.time')
      : timeProblem
        ? t('checkout.errors.slotGone')
        : null;

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <ol className={styles.stepper} aria-label={t('checkout.title')}>
          <li aria-current={step === 'details' ? 'step' : undefined}>
            {t('checkout.steps.contact')}
          </li>
          <li aria-current={step === 'review' ? 'step' : undefined}>
            {t('checkout.steps.review')}
          </li>
        </ol>

        {/* Kept mounted while reviewing, so "Change" returns to everything the customer entered. */}
        <form
          ref={detailsTop}
          className={styles.form}
          onSubmit={onReview}
          noValidate
          hidden={step !== 'details'}
        >
          <p className={styles.note}>{t('checkout.guestNote')}</p>

          <section className={styles.step} aria-labelledby="step-pickup">
            <h2 id="step-pickup" className={styles.stepTitle}>
              <span className={styles.stepNumber}>01</span>
              {t('checkout.steps.pickup')}
            </h2>
            {/* One location today; the same control lists Location 2 once it is active. */}
            <ChoiceGroup
              legend={t('checkout.location')}
              value={locationId}
              onChange={setLocationId}
              choices={locations.map((l) => ({
                value: l.id,
                label: `${l.name} · ${l.address.street}`,
              }))}
            />
            {canPickUpToday ? (
              <>
                <ChoiceGroup<TimeMode>
                  legend={t('checkout.pickupTime')}
                  value={asapAvailable ? timeMode : 'scheduled'}
                  onChange={setTimeMode}
                  choices={[
                    ...(asapAvailable
                      ? [
                          {
                            value: 'asap' as const,
                            label: t('checkout.asap', { minutes: preparation }),
                          },
                        ]
                      : []),
                    ...(slots.length
                      ? [{ value: 'scheduled' as const, label: t('checkout.scheduled') }]
                      : []),
                  ]}
                />
                {(timeMode === 'scheduled' || !asapAvailable) && slots.length > 0 && (
                  <label className={styles.selectField}>
                    <span>{t('checkout.chooseTime')}</span>
                    <select
                      className={styles.select}
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      aria-invalid={timeProblem ? true : undefined}
                    >
                      <option value="">—</option>
                      {slots.map((s) => (
                        <option key={s.toISOString()} value={s.toISOString()}>
                          {timeFormat.format(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <p className={styles.error}>{t('checkout.noSlots')}</p>
            )}
            {timeErrorText && (
              <p className={styles.error} role="alert">
                {timeErrorText}
              </p>
            )}
            <div className={styles.estimate}>
              <Badge tone="outline">{t('checkout.timePreliminary')}</Badge>
              <p className={styles.note}>
                {t('checkout.prepNote', { minutes: preparation })} {t('checkout.timeNote')}
              </p>
            </div>
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
              maxLength={80}
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

          {failure && step === 'details' && (
            <p className={styles.error} role="alert">
              {failure}
            </p>
          )}
          <div>
            <Button type="submit" size="lg" disabled={busy || !canPickUpToday}>
              {busy ? t('cart.promo.checking') : t('checkout.reviewCta')}
            </Button>
          </div>
        </form>

        {step === 'review' && quote && location && (
          <OrderReview
            headingRef={reviewHeading}
            quote={quote}
            location={location}
            pickupLabel={
              pickupTime === 'asap'
                ? t('checkout.asap', { minutes: preparation })
                : timeFormat.format(new Date(pickupTime))
            }
            contact={normalizeContact(contact)}
            busy={busy}
            failure={failure}
            onEdit={() => {
              setStep('details');
              setFailure(null);
            }}
            onConfirm={onConfirm}
          />
        )}
      </div>

      {step === 'details' && (
        <aside className={styles.aside} aria-label={t('checkout.summary')}>
          <Card>
            <h2 className={styles.asideTitle}>{t('checkout.summary')}</h2>
            <CartSummary cart={cart} tip={tipCents} />
          </Card>
        </aside>
      )}
    </div>
  );
}
