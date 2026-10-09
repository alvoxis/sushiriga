import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The whole order life cycle on the real backend: a guest orders and pays, staff accept the order
 * with a preparation time and move it to pickup, the customer follows it and leaves a review,
 * an administrator publishes it. Plus promo codes and "sold out" dishes from the admin panel.
 *
 * Payment: without Stripe test keys the server's Stripe calls go to the local stand-in
 * (fakeStripeApi.mjs); "the customer pays" is simulated there, everything else is real.
 */
test.skip(!process.env.STRIPE_API_BASE, 'covered by stripe.spec.ts when real Stripe keys are set');

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

async function syncClock(page: Page) {
  const health = (await (await page.request.get('/api/health')).json()) as { time: string };
  await page.clock.install({ time: new Date(health.time) });
}

async function placeOrder(page: Page): Promise<{ id: string; token: string }> {
  await syncClock(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e.seeded')) {
      localStorage.setItem(
        'sushiriga.cart.v1',
        JSON.stringify([{ productId: 'maestro', quantity: 2 }]),
      );
      sessionStorage.setItem('e2e.seeded', '1');
    }
  });
  await page.goto('/checkout');
  await page.getByLabel('Vārds').fill('Anna Bērziņa');
  await page.getByLabel('Tālrunis').fill('+371 20 000 000');
  await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
  await page.getByRole('button', { name: 'Apstiprināt un turpināt uz apmaksu' }).click();
  await expect(page).toHaveURL(/\/order\/SR-/);
  await expect(page.getByRole('button', { name: 'Apmaksāt tiešsaistē' })).toBeVisible();
  const id = page.url().split('/').pop()!;
  const token = await page.evaluate(
    (orderId) =>
      (
        JSON.parse(localStorage.getItem('sushiriga.order-tokens.v1') ?? '{}') as Record<
          string,
          string
        >
      )[orderId]!,
    id,
  );
  return { id, token };
}

/** The customer's card payment, as Stripe would report it. */
async function pay(request: APIRequestContext, order: { id: string; token: string }) {
  const headers = { 'X-Order-Token': order.token };
  const session = (await (
    await request.post(`/api/orders/${order.id}/payment`, { headers })
  ).json()) as { clientSecret: string };
  const intentId = session.clientSecret.split('_secret_')[0]!;
  expect((await request.post(`${process.env.STRIPE_API_BASE}/test/succeed/${intentId}`)).ok()).toBe(
    true,
  );
  const refreshed = (await (
    await request.post(`/api/orders/${order.id}/payment/refresh`, { headers })
  ).json()) as { status: string };
  expect(refreshed.status).toBe('PAID');
}

async function signIn(page: Page) {
  await page.goto('/admin');
  await page.getByLabel('E-pasts').fill(ADMIN_EMAIL);
  await page.getByLabel('Parole').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Pieslēgties' }).click();
  await expect(page.getByText('Pieslēdzies: E2E Admin')).toBeVisible();
}

const card = (page: Page, id: string) => page.locator('article', { hasText: id });

test('order → payment → staff → pickup → review → moderation', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const order = await placeOrder(page);
  await pay(page.request, order);
  await page.reload();
  await expect(page.getByTestId('order-status')).toContainText('Apmaksāts');
  await expect(page.getByRole('button', { name: 'Apmaksāt tiešsaistē' })).toHaveCount(0);

  // ---- Staff ----
  const staffContext = await browser.newContext({ locale: 'lv-LV' });
  const staff = await staffContext.newPage();
  await signIn(staff);
  await expect(card(staff, order.id)).toBeVisible();
  await expect(staff.getByTestId('admin-summary')).toBeVisible();
  await card(staff, order.id).getByLabel('Pagatavošanas laiks').selectOption('45');
  await card(staff, order.id).getByRole('button', { name: 'Pieņemt' }).click();
  await expect(card(staff, order.id)).toHaveCount(0); // left "new"

  await staff.getByRole('radio', { name: 'Procesā' }).check();
  await card(staff, order.id).getByRole('button', { name: 'Atzīmēt “Tiek gatavots”' }).click();
  await expect(card(staff, order.id).getByText('Tiek gatavots', { exact: true })).toBeVisible();

  // The customer's page follows the order (it refreshes; a reload is just faster here).
  await page.reload();
  await expect(page.getByTestId('order-status')).toContainText('Tiek gatavots');
  await expect(page.getByText('45 min')).toBeVisible();

  await card(staff, order.id).getByRole('button', { name: 'Atzīmēt “Gatavs saņemšanai”' }).click();
  await staff.getByRole('radio', { name: 'Gatavi' }).check();
  await card(staff, order.id).getByRole('button', { name: 'Atzīmēt “Saņemts”' }).click();
  await expect(card(staff, order.id)).toHaveCount(0);

  // ---- Customer: review ----
  await page.reload();
  await expect(page.getByTestId('order-status')).toContainText('Saņemts');
  await page.getByRole('radio', { name: '5 no 5' }).first().check({ force: true });
  const comment = `Ļoti garšīgi! ${order.id}`;
  await page.getByLabel('Komentārs').fill(comment);
  await page.getByRole('button', { name: 'Nosūtīt atsauksmi' }).click();
  await expect(page.getByText('Atsauksme parādīsies pēc moderācijas')).toBeVisible();

  await page.goto('/reviews');
  await expect(page.getByText(comment)).toHaveCount(0); // not public yet

  // ---- Administrator: publish ----
  await staff.getByRole('link', { name: 'Atsauksmes' }).click();
  const review = staff.locator('article', { hasText: comment });
  await review.getByRole('button', { name: 'Publicēt' }).click();
  await expect(review).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(comment)).toBeVisible();
  await staffContext.close();
});

test('staff cancel a paid order: the payment is refunded', async ({ page, browser }) => {
  const order = await placeOrder(page);
  await pay(page.request, order);

  const staffContext = await browser.newContext({ locale: 'lv-LV' });
  const staff = await staffContext.newPage();
  await signIn(staff);
  await card(staff, order.id).getByRole('button', { name: 'Atcelt pasūtījumu' }).click();
  const dialog = staff.getByRole('dialog');
  await expect(dialog).toContainText('tiks pilnībā atmaksāts ar Stripe');
  await dialog.getByRole('button', { name: 'Atcelt pasūtījumu' }).click();
  await expect(card(staff, order.id)).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('order-status')).toContainText('Atcelts');
  await staffContext.close();
});

test('promo codes and sold-out dishes from the admin panel reach customers', async ({
  page,
  browser,
}, testInfo) => {
  const code = `E2E${testInfo.project.name.startsWith('mobile') ? 'M' : 'D'}10`;
  const staffContext = await browser.newContext({ locale: 'lv-LV' });
  const staff = await staffContext.newPage();
  await signIn(staff);

  // A promo code, checked by the server at the customer's cart.
  await staff.getByRole('link', { name: 'Promokodi' }).click();
  await staff.getByLabel('Kods', { exact: true }).fill(code.toLowerCase());
  await staff.getByLabel('Atlaide, %').fill('10');
  await staff.getByRole('button', { name: 'Saglabāt' }).click();
  await expect(staff.getByText(`Promokods ${code} saglabāts.`)).toBeVisible();

  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e.seeded')) {
      localStorage.setItem(
        'sushiriga.cart.v1',
        JSON.stringify([{ productId: 'maestro', quantity: 2 }]),
      );
      sessionStorage.setItem('e2e.seeded', '1');
    }
  });
  await page.goto('/cart');
  await page.getByLabel('Promokods').fill(code);
  await page.getByRole('button', { name: 'Pielietot' }).click();
  await expect(page.getByRole('status').filter({ hasText: code })).toBeVisible();
  await expect(page.getByTestId('cart-total')).toHaveText(/18,90/);

  // A dish marked sold out disappears from what the server sells.
  const dish = 'fanta'; // no other test buys it
  await staff.getByRole('link', { name: 'Ēdienkarte' }).click();
  const toggle = staff.getByRole('checkbox', { name: /^Fanta — / });
  await toggle.click(); // saved on the server first, then shown
  await expect(toggle).not.toBeChecked();
  const catalog = (await (await page.request.get('/api/catalog')).json()) as {
    products: { id: string; available: boolean }[];
  };
  expect(catalog.products.find((p) => p.id === dish)?.available).toBe(false);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await staffContext.close();
});

test('the admin panel is closed without signing in', async ({ page, request }) => {
  expect((await request.get('/api/admin/orders')).status()).toBe(401);
  expect(
    (
      await request.post('/api/admin/login', {
        data: { email: ADMIN_EMAIL, password: 'nope-nope' },
      })
    ).status(),
  ).toBe(403); // no admin header → refused before anything else
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Darbinieku pieslēgšanās' })).toBeVisible();
  await page.getByLabel('E-pasts').fill(ADMIN_EMAIL);
  await page.getByLabel('Parole').fill('wrong password here');
  await page.getByRole('button', { name: 'Pieslēgties' }).click();
  await expect(page.getByRole('alert')).toHaveText('Nepareizs e-pasts vai parole.');
});
