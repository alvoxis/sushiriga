import { expect, test, type Page } from '@playwright/test';
import { categories, products } from '../src/data/menu';

/** No horizontal overflow on the narrowest supported phones (320px), for every dish and chapter. */
test.describe('narrow phones (320px)', () => {
  test.use({ viewport: { width: 320, height: 568 }, locale: 'lv-LV' });

  async function expectNoHorizontalOverflow(page: Page, path: string) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }

  test('main routes', async ({ page }) => {
    for (const path of [
      '/',
      '/menu',
      '/cart',
      '/checkout',
      '/pickup',
      '/assistant',
      '/account',
      '/reviews',
    ]) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      await expectNoHorizontalOverflow(page, path);
    }
  });

  test('every chapter, as a book and as a list', async ({ page }) => {
    for (const category of categories.filter((c) => !c.hidden)) {
      const path = `/menu/${category.slug}`;
      await page.goto(path);
      await expect(page.getByRole('region', { name: /grāmata/ })).toBeVisible();
      await expectNoHorizontalOverflow(page, path);
    }
    await page.getByRole('radio', { name: 'Saraksts' }).check({ force: true });
    for (const category of categories.filter((c) => !c.hidden)) {
      await page.goto(`/menu/${category.slug}`);
      await expect(page.getByTestId('product-card').first()).toBeVisible();
      await expectNoHorizontalOverflow(page, `/menu/${category.slug} (list)`);
    }
  });

  test('every product page', async ({ page }) => {
    test.setTimeout(120_000);
    for (const product of products) {
      const path = `/product/${product.id}`;
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expectNoHorizontalOverflow(page, path);
    }
  });

  test('the book and its buttons fit on screen, the cart stays reachable', async ({ page }) => {
    await page.goto('/menu/sushi-seti');
    const book = page.getByRole('region', { name: /grāmata/ });
    await book.scrollIntoViewIfNeeded();
    const scene = (await book.locator('div[class*="scene"]').boundingBox())!;
    expect(scene.x).toBeGreaterThanOrEqual(0);
    expect(scene.x + scene.width).toBeLessThanOrEqual(320);
    expect(scene.height).toBeLessThan(568);
    const nav = page.getByRole('navigation', { name: 'Ātrā navigācija' });
    await expect(nav.getByRole('link', { name: /^Grozs/ })).toBeVisible();
    for (const button of await nav.getByRole('link').all()) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44); // comfortable touch target
    }
  });
});
