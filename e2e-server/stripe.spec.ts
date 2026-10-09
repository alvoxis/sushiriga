import { expect, test } from '@playwright/test';

/**
 * REAL Stripe test-mode payment, end to end: Payment Element in Stripe's iframe, test card
 * 4242 4242 4242 4242, then the server asks Stripe and marks the order PAID.
 *
 * Runs only with Stripe TEST keys in the environment (never live keys):
 *   STRIPE_SECRET_KEY=sk_test_… STRIPE_PUBLISHABLE_KEY=pk_test_… STRIPE_WEBHOOK_SECRET=whsec_… \
 *   npm run test:e2e:server
 * Without them it is reported as skipped — it is never "passed" without talking to Stripe.
 */
const testKeys =
  process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') &&
  process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') &&
  process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_');

test.skip(
  !testKeys,
  'needs Stripe TEST keys (STRIPE_SECRET_KEY / _PUBLISHABLE_KEY / _WEBHOOK_SECRET)',
);

test('pays an order with a Stripe test card and the server marks it PAID', async ({ page }) => {
  test.setTimeout(90_000);
  const health = (await (await page.request.get('/api/health')).json()) as { time: string };
  await page.clock.install({ time: new Date(health.time) });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e.seeded')) {
      localStorage.setItem(
        'sushiriga.cart.v1',
        JSON.stringify([{ productId: 'maestro', quantity: 1 }]),
      );
      sessionStorage.setItem('e2e.seeded', '1');
    }
  });
  await page.goto('/checkout');
  await page.getByLabel('Vārds').fill('Stripe Test');
  await page.getByLabel('Tālrunis').fill('+371 20 000 000');
  await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
  await page.getByRole('button', { name: 'Apstiprināt un turpināt uz apmaksu' }).click();
  await expect(page).toHaveURL(/\/order\/SR-/);

  await page.getByRole('button', { name: 'Apmaksāt tiešsaistē' }).click();
  const stripe = page.frameLocator('iframe[title*="payment" i]').first();
  await stripe.locator('[name="number"]').fill('4242 4242 4242 4242');
  await stripe.locator('[name="expiry"]').fill('12 / 34');
  await stripe.locator('[name="cvc"]').fill('123');
  const postal = stripe.locator('[name="postalCode"]');
  if (await postal.isVisible().catch(() => false)) await postal.fill('1063');
  await page.getByRole('button', { name: /^Apmaksāt .*€$/ }).click();

  await expect(page.getByTestId('order-status')).toContainText('Apmaksāts', { timeout: 60_000 });
});
