import { expect, test } from '@playwright/test';
import { categories } from '../src/data/menu';
import { expectBookPagesFit, forceWideFonts } from './helpers';

const chapters = categories.filter((c) => !c.hidden);

test('all 13 chapters are on the shelf and each opens its own book', async ({ page }) => {
  await page.goto('/menu');
  const shelf = page.getByRole('navigation', { name: 'Ēdienkartes kategorijas' });
  await expect(shelf.getByRole('link')).toHaveCount(13);
  for (const chapter of chapters) {
    await page.goto('/menu');
    await shelf.locator(`a[href="/menu/${chapter.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/menu/${chapter.slug}$`));
    await expect(page.getByRole('heading', { level: 1, name: chapter.name.lv })).toBeVisible();
    await expect(
      page.getByRole('region', { name: `${chapter.name.lv} — ēdienkartes grāmata` }),
    ).toBeVisible();
  }
});

test('search → dish page in the book → add → cart', async ({ page, isMobile }) => {
  await page.goto('/menu');
  await page.getByRole('searchbox', { name: 'Meklēt ēdienkartē' }).fill('poke eel');
  await expect(page.getByTestId('search-result')).toHaveCount(1);
  await page.getByRole('link', { name: 'Atvērt Poke Eel grāmatā “Poke”' }).click();
  await expect(page).toHaveURL(/\/menu\/poke\?dish=poke-eel$/);
  const book = page.getByRole('region', { name: 'Poke — ēdienkartes grāmata' });
  const entry = book.locator('li[data-highlighted]');
  await expect(entry).toContainText('Poke Eel');
  await entry.getByRole('button', { name: 'Pievienot grozam: Poke Eel' }).click();
  await expect(page.getByText('Poke Eel pievienots grozam')).toBeVisible();

  const cartLink = isMobile
    ? page
        .getByRole('navigation', { name: 'Ātrā navigācija' })
        .getByRole('link', { name: 'Grozs, preces: 1' })
    : page.getByRole('banner').getByRole('link', { name: 'Grozs, preces: 1' });
  await cartLink.click();
  await expect(page.getByTestId('cart-total')).toHaveText(/14,00\s€/);
  // back to the chapters from a category page
  await page.goto('/menu/poke');
  await page.getByRole('link', { name: '← Visas nodaļas' }).click();
  await expect(page).toHaveURL(/\/menu$/);
});

test.describe('every book page fits without cutting dishes', () => {
  test.beforeEach(async ({ context }) => forceWideFonts(context));

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
    { width: 1280, height: 800 },
  ]) {
    test(`${viewport.width}×${viewport.height}`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'viewport is set explicitly; run once');
      await page.setViewportSize(viewport);
      for (const path of ['/', ...chapters.map((chapter) => `/menu/${chapter.slug}`)]) {
        await page.goto(path);
        await expect(page.getByRole('region', { name: /grāmata/ })).toBeVisible();
        await expectBookPagesFit(page, `${path} at ${viewport.width}×${viewport.height}`);
      }
    });
  }
});
