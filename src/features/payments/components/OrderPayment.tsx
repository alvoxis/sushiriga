import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { paths, ROUTES } from '@/app/routes';
import { Button, ButtonLink, Card } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useServices } from '@/services';
import { PaymentError, type PaymentAvailability } from '@/services/payments/paymentService';
import type { Order } from '@/types';
import { loadStripeJs } from '../stripe';
import styles from './payment.module.css';

type Phase = 'idle' | 'loading' | 'ready' | 'paying' | 'confirming' | 'waiting';

const CONFIRM_ATTEMPTS = 10;
const CONFIRM_INTERVAL_MS = 2000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Online payment for an unpaid order (Stripe Payment Element). The amount is the server's order
 * total; card data goes to Stripe only. After paying, the page asks the SERVER to confirm the
 * payment with Stripe — the order becomes PAID only when the server says so.
 */
export function OrderPayment({ order, onPaid }: { order: Order; onPaid: (order: Order) => void }) {
  const { t, locale, formatPrice } = useTranslation();
  const { payments } = useServices();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [availability, setAvailability] = useState<PaymentAvailability | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  const redirectStatus = useRef(searchParams.get('redirect_status'));

  useEffect(() => {
    let active = true;
    payments.availability().then((result) => active && setAvailability(result));
    return () => {
      active = false;
    };
  }, [payments]);

  useEffect(() => () => stripeRef.current?.elements.getElement('payment')?.destroy(), []);

  function explain(failure: unknown) {
    const code = failure instanceof PaymentError ? failure.code : 'failed';
    if (code === 'pickup-unavailable' || code === 'order-closed') setBlocked(true);
    setError(
      {
        'pickup-unavailable': t('payment.errors.pickup'),
        'order-closed': t('payment.errors.closed'),
        'payments-unavailable': t('payment.errors.unavailable'),
        network: t('payment.errors.network'),
        'payment-not-needed': t('payment.errors.failed'),
        failed: t('payment.errors.failed'),
      }[code],
    );
  }

  /** Asks the server (which asks Stripe) until the order is paid. */
  async function waitUntilPaid() {
    setPhase('confirming');
    setError(null);
    for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
      try {
        const fresh = await payments.refresh(order.id);
        if (fresh.status !== 'PENDING_PAYMENT') {
          onPaid(fresh);
          return;
        }
      } catch {
        // keep trying — the order page also refreshes on its own
      }
      await sleep(CONFIRM_INTERVAL_MS);
    }
    setPhase('waiting');
  }

  // Back from a bank page (3-D Secure, bank link): Stripe appends ?redirect_status=…
  useEffect(() => {
    const status = redirectStatus.current;
    if (!status) return;
    redirectStatus.current = null;
    navigate(paths.order(order.id), { replace: true }); // drop the client secret from the URL
    if (status === 'failed') {
      queueMicrotask(() => setError(t('payment.errors.failed')));
    } else {
      queueMicrotask(() => void waitUntilPaid());
    }
    // Runs once on arrival; the handlers read the latest state themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function open() {
    if (!availability?.available) return;
    setPhase('loading');
    setError(null);
    try {
      const session = await payments.start(order.id);
      const stripe = await loadStripeJs(availability.publishableKey, locale);
      if (!stripe) throw new PaymentError('payments-unavailable', 'Stripe.js did not load');
      const elements = stripe.elements({
        clientSecret: session.clientSecret,
        locale,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#22304a',
            colorBackground: '#fbf8f2',
            colorText: '#1d1b19',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          },
        },
      });
      const element = elements.create('payment', { layout: 'tabs' });
      stripeRef.current = { stripe, elements };
      if (mountRef.current) element.mount(mountRef.current);
      setPhase('ready');
    } catch (failure) {
      if (failure instanceof PaymentError && failure.code === 'payment-not-needed') {
        await waitUntilPaid(); // already paid (e.g. in another tab)
        return;
      }
      explain(failure);
      setPhase('idle');
    }
  }

  async function pay() {
    const current = stripeRef.current;
    if (!current) return;
    setPhase('paying');
    setError(null);
    const result = await current.stripe.confirmPayment({
      elements: current.elements,
      confirmParams: { return_url: `${window.location.origin}${paths.order(order.id)}` },
      redirect: 'if_required',
    });
    if (result.error) {
      // Card and validation messages come from Stripe, already in the customer's language.
      const fromStripe =
        result.error.type === 'card_error' || result.error.type === 'validation_error';
      setError(
        fromStripe && result.error.message ? result.error.message : t('payment.errors.failed'),
      );
      setPhase('ready');
      return;
    }
    await waitUntilPaid();
  }

  if (!availability) return null;
  if (!availability.available) {
    return availability.reason === 'demo' ? null : (
      <p className={styles.note} role="note">
        {t('payment.unavailable')}
      </p>
    );
  }

  const amount = formatPrice(order.total);
  const formVisible = phase === 'loading' || phase === 'ready' || phase === 'paying';
  return (
    <Card as="section" className={styles.card} aria-labelledby="payment-title">
      <h2 id="payment-title" className={styles.title}>
        {t('payment.title')}
      </h2>
      <p className={styles.amount}>{t('payment.amount', { amount })}</p>

      {phase === 'idle' && !blocked && (
        <div>
          <Button size="lg" onClick={() => void open()}>
            {t('payment.start')}
          </Button>
        </div>
      )}
      {phase === 'loading' && <p role="status">{t('payment.loading')}</p>}
      <div ref={mountRef} className={styles.element} hidden={!formVisible} />
      {(phase === 'ready' || phase === 'paying') && (
        <div>
          <Button size="lg" onClick={() => void pay()} disabled={phase === 'paying'}>
            {phase === 'paying' ? t('payment.processing') : t('payment.pay', { amount })}
          </Button>
        </div>
      )}
      {phase === 'confirming' && <p role="status">{t('payment.confirming')}</p>}
      {phase === 'waiting' && <p role="status">{t('payment.pendingLong')}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {blocked && (
        <div>
          <ButtonLink to={ROUTES.menu} variant="secondary">
            {t('payment.newOrder')}
          </ButtonLink>
        </div>
      )}
      <p className={styles.note}>{t('payment.secure')}</p>
    </Card>
  );
}
