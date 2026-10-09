import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, forceWideFonts } from '../e2e/helpers';

/**
 * The real backend: frontend built with VITE_API_URL="/", served by dist-server with SQLite.
 * Nothing here is mocked — orders are priced, stored and read back by the server.
 */

/** Install the browser clock at the server's clock, so both agree on pickup times. */
async function syncClock(page: Page) {
  const health = (await (await page.request.get('/api/health')).json()) as { time: string };
  await page.clock.install({ time: new Date(health.time) });
}

async function seedCart(page: Page, items: { productId: string; quantity: number }[]) {
  await page.addInitScript((cart) => {
    if (!sessionStorage.getItem('e2e.seeded')) {
      localStorage.setItem('sushiriga.cart.v1', JSON.stringify(cart));
      sessionStorage.setItem('e2e.seeded', '1');
    }
  }, items);
}

test('the menu comes from the backend and there is no demo mode', async ({ page }) => {
  const catalog = page.waitForResponse((r) => r.url().endsWith('/api/catalog') && r.ok());
  await page.goto('/menu');
  await catalog;
  await expect(page.getByRole('navigation', { name: /kategorijas/i })).toBeVisible();
  await expect(page.getByText('Demo režīms')).toHaveCount(0);
});

test('guest order through the real backend: stored, priced by the server, readable only with its token', async ({
  page,
  browser,
}) => {
  await syncClock(page);
  await seedCart(page, [
    { productId: 'maestro', quantity: 2 },
    { productId: 'poke-eel', quantity: 1 },
  ]);
  await page.goto('/checkout');
  await page.getByLabel('Vārds').fill('Anna Bērziņa');
  await page.getByLabel('Tālrunis').fill('+371 20 000 000');
  await page.getByLabel('E-pasts').fill('anna@example.lv');
  const quote = page.waitForResponse((r) => r.url().endsWith('/api/checkout/quote'));
  await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
  expect((await quote).status()).toBe(200);

  const review = page.getByTestId('order-review');
  await expect(review.getByTestId('review-total')).toHaveText(/35,00/);
  if (process.env.STRIPE_SECRET_KEY) {
    await expect(review.getByText(/droša tiešsaistes apmaksa ar Stripe/)).toBeVisible();
  } else {
    await expect(review.getByText(/Tiešsaistes apmaksa vēl nav pieejama/)).toBeVisible();
  }
  await review
    .getByRole('button', { name: /^Apstiprināt (pasūtījumu|un turpināt uz apmaksu)$/ })
    .click();

  await expect(page).toHaveURL(/\/order\/SR-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  await expect(page.getByText('Pasūtījums izveidots — gaida apmaksu')).toBeVisible();
  await expect(page.getByTestId('order-status')).toContainText('Gaida apmaksu');
  // This server has no Stripe keys: no payment form, an honest note instead.
  if (!process.env.STRIPE_SECRET_KEY) {
    await expect(page.getByText(/Tiešsaistes apmaksa vēl nav pieejama/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apmaksāt tiešsaistē' })).toHaveCount(0);
  }
  const orderId = page.url().split('/').pop()!;

  // It lives on the server: a reload reads it back.
  await page.reload();
  await expect(page.getByTestId('order-status')).toContainText('Gaida apmaksu');
  await expect(page.getByText('35,00 €').first()).toBeVisible();

  // Without the access token (API call or another browser) the order cannot be seen.
  expect((await page.request.get(`/api/orders/${orderId}`)).status()).toBe(404);
  const stranger = await browser.newPage();
  await stranger.goto(`/order/${orderId}`);
  await expect(
    stranger.getByRole('heading', { name: 'Pasūtījumu neizdevās atrast.' }),
  ).toBeVisible();
  await stranger.close();
});

test.describe('live checkout on a narrow phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('review and order pages fit at 360px', async ({ page, context }) => {
    await forceWideFonts(context);
    await syncClock(page);
    await seedCart(page, [{ productId: 'hot-tomago-spicy-maki-1-plus-1', quantity: 3 }]);
    await page.goto('/checkout');
    await page.getByLabel('Vārds').fill('Anna Bērziņa-Kalniņa');
    await page.getByLabel('Tālrunis').fill('+371 20 000 000');
    await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
    await expect(page.getByTestId('order-review')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'live review 360');
    await page.getByRole('button', { name: 'Apstiprināt pasūtījumu' }).click();
    await expect(page.getByTestId('order-status')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'live order 360');
  });
});
