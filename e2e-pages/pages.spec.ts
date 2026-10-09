import { expect, test, type Page } from '@playwright/test';

/**
 * The static demo on GitHub Pages (https://alvoxis.github.io/sushiriga/): every asset and link
 * under /sushiriga/, deep links through 404.html, the demo order flow, no console errors.
 * Paths here are RELATIVE ("menu/rolli") so they stay under the project base path.
 */
const BASE = new URL(process.env.PAGES_TEST_URL ?? 'http://127.0.0.1:4177/sushiriga/').pathname;

function watchErrors(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    // A deep link's first response is GitHub Pages' 404.html (by design) — not an app error.
    if (message.type() === 'error' && !message.text().includes('404')) {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('response', (response) => {
    const isDocument = response.request().resourceType() === 'document';
    if (response.status() >= 400 && !isDocument)
      problems.push(`${response.status()} ${response.url()}`);
  });
  return problems;
}

test('home page: assets load from the base path, demo mode is shown', async ({ page }) => {
  const problems = watchErrors(page);
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Demo režīms')).toBeVisible();
  await expect(page.getByRole('region', { name: /grāmata/ }).first()).toBeVisible();
  const favicon = await page.request.get(`${BASE}favicon.svg`);
  expect(favicon.status()).toBe(200);
  // Every internal link stays inside the project site.
  const hrefs = await page
    .locator('a[href^="/"]')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThan(5);
  // "/sushiriga" (home, as React Router writes it) is redirected by Pages to "/sushiriga/".
  const home = BASE.replace(/\/$/, '');
  expect(hrefs.filter((href) => href !== home && !href.startsWith(BASE))).toEqual([]);
  expect(problems).toEqual([]);
});

test('navigation inside the app keeps the base path', async ({ page }) => {
  const problems = watchErrors(page);
  await page.goto('./');
  await page.getByRole('link', { name: 'Ēdienkarte' }).first().click();
  await expect(page).toHaveURL(new RegExp(`${BASE}menu$`));
  await page
    .getByRole('navigation', { name: /kategorijas/i })
    .getByRole('link', { name: /Tempura/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`${BASE}menu/tempura$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Tempura' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('deep links and reloads work through 404.html', async ({ page }) => {
  const problems = watchErrors(page);
  for (const [path, heading] of [
    ['menu/rolli', 'Rolli'],
    ['product/maestro', 'Maestro'],
    ['pickup', /Saņemšana|Pašizņemšana/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  await page.goto('this/page/does/not/exist');
  await expect(page.getByRole('heading', { name: 'Lapa nav atrasta' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('demo order: cart → checkout → order page, which survives a reload', async ({ page }) => {
  const problems = watchErrors(page);
  await page.clock.install({ time: new Date('2026-10-05T12:00:00+03:00') });
  await page.goto('product/maestro');
  await page.getByRole('button', { name: 'Pievienot grozam' }).click();
  await page.goto('checkout');
  await page.getByLabel('Vārds').fill('Anna');
  await page.getByLabel('Tālrunis').fill('+371 20 000 000');
  await page.getByRole('button', { name: 'Pārbaudīt pasūtījumu' }).click();
  await page.getByRole('button', { name: 'Apstiprināt demo pasūtījumu' }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}order/SR-`));
  await expect(page.getByTestId('order-status')).toContainText('Gaida apmaksu');
  await page.reload();
  await expect(page.getByTestId('order-status')).toContainText('Gaida apmaksu');
  expect(problems).toEqual([]);
});

test('language choice is remembered; the admin panel explains it needs the backend', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Русский/ }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.goto('admin');
  await expect(page.getByText(/работает с backend/)).toBeVisible();
});
