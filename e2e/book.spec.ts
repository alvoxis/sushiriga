import { expect, test } from '@playwright/test';

test.use({ locale: 'en-US' });

test('the cover opens the book and pages turn', async ({ page }) => {
  await page.goto('/menu/tempura');
  const book = page.getByRole('region', { name: 'Tempura — menu book' });
  await expect(book.getByText(/^Page 1 of/)).toBeVisible();
  await book.getByRole('button', { name: 'Open the book' }).click();
  await expect(book.getByText(/^Page 2 of/)).toBeVisible();
  await book.getByRole('button', { name: 'Next page' }).click();
  await expect(book.getByText(/^Page 3 of/)).toBeVisible();
  await book.getByRole('button', { name: 'Previous page' }).click();
  await expect(book.getByText(/^Page 2 of/)).toBeVisible();
});

test('keyboard: arrows, Home and End', async ({ page }) => {
  await page.goto('/menu/special');
  const book = page.getByRole('region', { name: 'Special — menu book' });
  await book.focus();
  await page.keyboard.press('ArrowRight');
  await expect(book.getByText(/^Page 2 of/)).toBeVisible();
  await page.keyboard.press('End');
  await expect(book.getByRole('link', { name: /^Next chapter:/ })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(book.getByText(/^Page 1 of/)).toBeVisible();
});

test('desktop: clicking the page corner turns the page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse corners exist only for precise pointers');
  await page.goto('/menu/rolli');
  const book = page.getByRole('region', { name: 'Rolls — menu book' });
  await book.getByRole('button', { name: 'Open the book' }).click();
  await expect(book.getByText(/^Page 2 of/)).toBeVisible();
  const scene = book.locator('div[class*="scene"]');
  const box = (await scene.boundingBox())!;
  await page.mouse.click(box.x + box.width - 8, box.y + box.height - 20);
  await expect(book.getByText(/^Page 3 of/)).toBeVisible();
});

test('mobile: "+" inside the book adds to the cart and does not turn the page', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'touch layout');
  await page.goto('/menu/rolli');
  const book = page.getByRole('region', { name: 'Rolls — menu book' });
  await book.getByRole('button', { name: 'Open the book' }).tap();
  await book.getByRole('button', { name: 'Next page' }).tap();
  await expect(book.getByText(/^Page 3 of/)).toBeVisible();
  await book.getByRole('button', { name: 'Add to cart: Philadelfia Classic' }).tap();
  await expect(page.getByText('Philadelfia Classic added to the cart')).toBeVisible();
  await expect(book.getByText(/^Page 3 of/)).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Quick navigation' });
  await expect(nav.getByRole('link', { name: 'Cart, items: 1' })).toBeVisible();
});

test('reduced motion: pages change instantly and the book still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const book = page.getByRole('region', { name: 'Menu — menu book' });
  await book.getByRole('button', { name: 'Open the book' }).click();
  await expect(book.getByText(/^Page 2 of/)).toBeVisible();
  const duration = await book
    .locator('[data-leaf="0"]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(duration)).toBeLessThan(0.05);
});

test('no console errors on the main screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  for (const path of [
    '/',
    '/menu',
    '/menu/poke',
    '/product/poke-salmon',
    '/cart',
    '/checkout',
    '/pickup',
    '/assistant',
  ]) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
