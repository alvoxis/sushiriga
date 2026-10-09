import { defineConfig, devices } from '@playwright/test';

/**
 * The GitHub Pages build (`npm run build:pages`, base /sushiriga/) served the way GitHub Pages
 * serves it (e2e-pages/pagesServer.mjs): static files, 404.html for deep links.
 */
const PORT = 4177;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: './e2e-pages',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // Trailing slash: relative paths in the tests ("menu/rolli") stay inside /sushiriga/.
    baseURL: process.env.PAGES_TEST_URL ?? `http://127.0.0.1:${PORT}/sushiriga/`,
    locale: 'lv-LV',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], ...chromiumLaunch } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], ...chromiumLaunch } },
  ],
  // PAGES_TEST_URL=https://alvoxis.github.io/sushiriga/ checks the published site instead.
  ...(process.env.PAGES_TEST_URL
    ? {}
    : {
        webServer: {
          command: 'npm run build:pages && node e2e-pages/pagesServer.mjs',
          url: `http://127.0.0.1:${PORT}/sushiriga/`,
          reuseExistingServer: false,
          timeout: 180_000,
          env: { PORT: String(PORT) },
        },
      }),
});
