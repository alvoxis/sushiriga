import { expect, test } from '@playwright/test';

test.use({ locale: 'en-US' });

test('app starts and the menu book turns pages', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'A menu you can leaf through' }),
  ).toBeVisible();
  const book = page.getByRole('region', { name: 'Menu — menu book' });
  await expect(book.getByText(/^Page 1 of/)).toBeVisible();
  await book.getByRole('button', { name: 'Next page' }).click();
  await expect(book.getByText(/^Page 2 of/)).toBeVisible();
});

test('menu loads and a category opens', async ({ page }) => {
  await page.goto('/menu');
  const shelf = page.getByRole('navigation', { name: 'Menu categories' });
  await expect(shelf.getByRole('link')).toHaveCount(13);
  await shelf.getByRole('link', { name: /Hosomaki/ }).click();
  await expect(page).toHaveURL(/\/menu\/hosomaki$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Hosomaki' })).toBeVisible();
});

test('product → cart → quantity → total', async ({ page, isMobile }) => {
  await page.goto('/product/maestro');
  await expect(page.getByRole('heading', { level: 1, name: 'Maestro' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Maestro added to the cart')).toBeVisible();

  const nav = isMobile
    ? page.getByRole('navigation', { name: 'Quick navigation' })
    : page.getByRole('banner');
  await nav.getByRole('link', { name: 'Cart, 1 items' }).click();

  await expect(page.getByTestId('cart-total')).toHaveText('€10.50');
  await page.getByRole('button', { name: 'One more Maestro' }).click();
  await expect(page.getByTestId('quantity')).toHaveText('2');
  await expect(page.getByTestId('cart-total')).toHaveText('€21.00');
});

test('cart survives a reload', async ({ page }) => {
  await page.goto('/product/sake-maki');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/cart');
  await page.reload();
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
});

test('mobile: swipe turns the page', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch only');
  await page.goto('/menu/tempura');
  const book = page.getByRole('region', { name: 'Tempura — menu book' });
  const scene = book.locator('div').first();
  const box = (await scene.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 5 });
  await page.mouse.up();
  await expect(book.getByText('Page 2 of 5')).toBeVisible();
});
