import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;

// Optional: point Playwright to a preinstalled Chromium (e.g. in CI containers).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], ...chromiumLaunch } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], ...chromiumLaunch } },
    // iPhone / WebKit: enable with PW_WEBKIT=1 once WebKit is installed (`npx playwright install webkit`).
    ...(process.env.PW_WEBKIT ? [{ name: 'mobile-webkit', use: { ...devices['iPhone 14'] } }] : []),
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
