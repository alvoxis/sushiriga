import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the REAL backend: the frontend is built with VITE_API_URL="/" and
 * served by the production server build (server/ → dist-server) with a fresh SQLite database.
 * The server clock starts on a Monday at 12:00 in Riga so pickup times are deterministic.
 */
const PORT = 4176;
const baseURL = `http://localhost:${PORT}`;
export const TEST_CLOCK_START = '2026-10-05T12:00:00+03:00';
const DB = 'node_modules/.tmp/e2e-server.db';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: './e2e-server',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, locale: 'lv-LV', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], ...chromiumLaunch } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], ...chromiumLaunch } },
  ],
  webServer: {
    command:
      `rm -f ${DB} ${DB}-wal ${DB}-shm && ` +
      'npx vite build --outDir dist-live && npm run server:build && npm run server:start',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_API_URL: '/',
      PORT: String(PORT),
      HOST: '127.0.0.1',
      PUBLIC_DIR: 'dist-live',
      DATABASE_PATH: DB,
      ORDER_TOKEN_SECRET: 'e2e-only-secret-e2e-only-secret-e2e-only',
      TEST_CLOCK_START,
    },
  },
});
