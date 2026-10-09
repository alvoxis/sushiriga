import type { Stripe } from '@stripe/stripe-js';
import type { Locale } from '@/types';

/**
 * Loads Stripe.js — from js.stripe.com, as Stripe requires (PCI) — only when someone actually
 * opens the payment form, so the rest of the site never downloads it.
 */
export async function loadStripeJs(publishableKey: string, locale: Locale): Promise<Stripe | null> {
  const { loadStripe } = await import('@stripe/stripe-js');
  return loadStripe(publishableKey, { locale });
}
