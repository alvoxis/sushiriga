import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Automated accessibility checks (axe-core, WCAG 2.1 A/AA) on the real backend, including the
 * interactive states a first-load audit never sees: form errors, the review step, an order page
 * and the signed-in admin panel. Automated checks find a part of the problems — not all.
 */
async function expectAccessible(page: Page, label: string) {
  // Measure the settled page, not a frame of the page-enter fade (it would skew contrast).
  await page.waitForFunction(() =>
    document.getAnimations().every(
      (animation) =>
        animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity, // e.g. the cat's idle motion
    ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Stripe renders its own iframe; it is Stripe's responsibility and not loaded here anyway.
    .exclude('iframe')
    .analyze();
  const problems = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(problems, `accessibility problems on ${label}`).toEqual([]);
}

test('customer pages and checkout states', async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of [
    '/',
    '/menu',
    '/menu/rolli',
    '/product/maestro',
    '/pickup',
    '/reviews',
    '/assistant',
  ]) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectAccessible(page, path);
  }

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
  await page.goto('/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
  await expectAccessible(page, 'cart');

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
  await expect(page.getByText('Lūdzu, aizpildi šo lauku.').first()).toBeVisible();
  await expectAccessible(page, 'checkout with errors');

  await page.getByLabel('Vārds').fill('Anna');
  await page.getByLabel('Tālrunis').fill('+371 20 000 000');
  await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
  await expect(page.getByTestId('order-review')).toBeVisible();
  await expectAccessible(page, 'review step');

  await page.getByRole('button', { name: /^Apstiprināt/ }).click();
  await expect(page.getByTestId('order-status')).toBeVisible();
  await expectAccessible(page, 'order page');
});

test('admin panel', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByLabel('Parole')).toBeVisible();
  await expectAccessible(page, 'admin sign-in');
  await page.getByLabel('E-pasts').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Parole').fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Pieslēgties' }).click();
  await expect(page.getByText('Pieslēdzies: E2E Admin')).toBeVisible();
  for (const [link, label] of [
    [null, 'admin orders'],
    ['Ēdienkarte', 'admin menu'],
    ['Promokodi', 'admin promo codes'],
    ['Atsauksmes', 'admin reviews'],
  ] as const) {
    if (link) await page.getByRole('link', { name: link }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page, label);
  }
});
