import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * System fonts differ between machines (CI runners often have wide DejaVu fonts). Forcing wide
 * fallback fonts makes layouts that only fit thanks to a narrow local font fail everywhere.
 */
export async function forceWideFonts(context: BrowserContext) {
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent =
        ':root{--font-body:"DejaVu Sans",Verdana,sans-serif!important;' +
        '--font-display:"DejaVu Serif",Georgia,serif!important}';
      document.head.appendChild(style);
    });
  });
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - width;
    const culprits: string[] = [];
    if (overflow > 0) {
      for (const el of document.querySelectorAll('body *')) {
        if (el.getBoundingClientRect().right <= width + 0.5) continue;
        let parent = el.parentElement;
        let clipped = false;
        while (parent) {
          if (
            getComputedStyle(parent).overflowX !== 'visible' &&
            parent.getBoundingClientRect().right <= width + 0.5
          ) {
            clipped = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (!clipped) {
          culprits.push(
            `${el.closest('[class]')?.className ?? el.tagName} "${(el.textContent ?? '').trim().slice(0, 30)}"`,
          );
        }
      }
    }
    return { overflow, culprits: [...new Set(culprits)].slice(0, 5) };
  });
  expect(
    result.overflow,
    `horizontal overflow on ${label}: ${result.culprits.join(' | ')}`,
  ).toBeLessThanOrEqual(0);
}

/** Every page of the open book must show its whole content without inner scrolling. */
export async function expectBookPagesFit(page: Page, label: string) {
  const crowded = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-roledescription="book"] [data-face] article > div')]
      .map((body) => ({
        face: (body.closest('[data-face]') as HTMLElement).dataset.face,
        overflow: body.scrollHeight - body.clientHeight,
      }))
      .filter((page) => page.overflow > 1),
  );
  expect(crowded, `book pages do not fit on ${label}`).toEqual([]);
}
