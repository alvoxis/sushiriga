import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, forceWideFonts } from './helpers';

/**
 * Phase 4 — cart, pickup time and guest checkout in a real browser, on the narrowest phones,
 * with wide fallback fonts. The clock is fixed to a Monday noon in Riga so pickup slots exist.
 */
const MONDAY_NOON_RIGA = new Date('2026-10-05T12:00:00+03:00');

/** The longest dish names on the menu, so text wrapping is exercised. */
const LONG_CART = [
  { productId: 'hot-tomago-spicy-maki-1-plus-1', quantity: 2 },
  { productId: 'fried-crispy-chicken-nuggets-9', quantity: 1 },
  { productId: 'sparkling-mineral-water', quantity: 3 },
];

const UI = {
  lv: {
    button: 'Latviešu',
    name: 'Vārds',
    phone: 'Tālrunis',
    email: 'E-pasts',
    review: 'Pārbaudīt pasūtījumu',
    confirm: 'Apstiprināt demo pasūtījumu',
    required: 'Lūdzu, aizpildi šo lauku.',
    pending: 'Gaida apmaksu',
    empty: 'Tavs grozs ir tukšs.',
  },
  ru: {
    button: 'Русский',
    name: 'Имя',
    phone: 'Телефон',
    email: 'E-mail',
    review: 'Проверить заказ',
    confirm: 'Подтвердить демо-заказ',
    required: 'Пожалуйста, заполните это поле.',
    pending: 'Ожидает оплаты',
    empty: 'Корзина пуста.',
  },
  en: {
    button: 'English',
    name: 'Name',
    phone: 'Phone',
    email: 'E-mail',
    review: 'Review order',
    confirm: 'Confirm demo order',
    required: 'Please fill in this field.',
    pending: 'Awaiting payment',
    empty: 'Your cart is empty.',
  },
} as const;

async function seedCart(page: Page, items: typeof LONG_CART) {
  await page.addInitScript((cart) => {
    if (!sessionStorage.getItem('e2e.seeded')) {
      localStorage.setItem('sushiriga.cart.v1', JSON.stringify(cart));
      sessionStorage.setItem('e2e.seeded', '1');
    }
  }, items);
}

for (const [width, lang] of [
  [320, 'lv'],
  [360, 'ru'],
  [390, 'en'],
] as const) {
  test.describe(`checkout at ${width}px (${lang})`, () => {
    test.use({ viewport: { width, height: 740 } });

    test.beforeEach(async ({ context, page }) => {
      await forceWideFonts(context);
      await page.clock.install({ time: MONDAY_NOON_RIGA });
    });

    test('empty cart, full cart, form errors, review and an unpaid order — no overflow', async ({
      page,
    }) => {
      const ui = UI[lang];
      await page.goto('/cart');
      if (lang !== 'lv') await page.getByRole('button', { name: ui.button }).click();
      await expect(page.getByText(ui.empty)).toBeVisible();
      await expectNoHorizontalOverflow(page, `empty cart ${width}`);

      await seedCart(page, LONG_CART);
      await page.reload();
      await expect(page.getByTestId('cart-line')).toHaveCount(3);
      await page.getByRole('textbox', { name: /promo|промокод|promokod/i }).fill('DEMO10');
      await page.getByRole('button', { name: /^(Apply|Применить|Pielietot)$/ }).click();
      await expect(page.locator('[data-mock]')).toBeVisible();
      await expectNoHorizontalOverflow(page, `full cart ${width}`);

      // In-app navigation: an applied promo lives in memory and is re-validated after a reload.
      await page.getByRole('main').locator('a[href="/checkout"]').click();
      await page.getByRole('button', { name: ui.review }).click();
      await expect(page.getByText(ui.required)).toHaveCount(2);
      await expectNoHorizontalOverflow(page, `checkout errors ${width}`);

      await page.getByLabel(ui.name).fill('Anna Bērziņa-Kalniņa');
      await page.getByLabel(ui.phone).fill('+371 20 000 000');
      await page.getByLabel(ui.email).fill('anna.berzina@example.lv');
      await page.getByRole('button', { name: ui.review }).click();

      const review = page.getByTestId('order-review');
      await expect(review).toBeVisible();
      // The details form is hidden while reviewing, not just pushed above the review.
      await expect(page.getByRole('button', { name: ui.review })).toBeHidden();
      await expect(review.getByTestId('review-total')).toHaveText(/20[.,]70/);
      await expectNoHorizontalOverflow(page, `review ${width}`);

      await review.getByRole('button', { name: ui.confirm }).click();
      await expect(page).toHaveURL(/\/order\/SR-/);
      await expect(page.getByTestId('order-status')).toContainText(ui.pending);
      await expectNoHorizontalOverflow(page, `order ${width}`);

      // Never presented as paid: no payment step is done, and the cart is empty afterwards.
      await expect(page.locator('ol li[data-state="done"]')).toHaveCount(0);
      const stored = await page.evaluate(() => localStorage.getItem('sushiriga.mock.orders.v2'));
      expect(JSON.parse(stored!)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING_PAYMENT', payment: null }),
        ]),
      );
    });
  });
}

test.describe('checkout rules in the browser', () => {
  test.beforeEach(async ({ page }) => seedCart(page, [{ productId: 'maestro', quantity: 1 }]));

  test('switching language keeps what was entered', async ({ page }) => {
    await page.clock.install({ time: MONDAY_NOON_RIGA });
    await page.goto('/checkout');
    await page.getByLabel(UI.lv.name).fill('Anna');
    await page.getByRole('button', { name: UI.ru.button }).click();
    await expect(page.getByLabel(UI.ru.name)).toHaveValue('Anna');
    await page.getByRole('button', { name: UI.en.button }).click();
    await expect(page.getByRole('button', { name: UI.en.review })).toBeVisible();
  });

  test('close to closing time no pickup can be ordered', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-05T21:40:00+03:00') });
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: UI.lv.review })).toBeDisabled();
    await expect(page.getByRole('radio', { name: /Pēc iespējas ātrāk/ })).toHaveCount(0);
  });
});
