import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the REAL backend: the frontend is built with VITE_API_URL="/" and
 * served by the production server build (server/ → dist-server) with a fresh SQLite database.
 * The server clock starts on a Monday at 12:00 in Riga so pickup times are deterministic.
 *
 * Payments: with Stripe TEST keys in the environment the server talks to Stripe (and
 * stripe.spec.ts pays with a test card). Without them, Stripe API calls go to a local stand-in
 * (e2e-server/fakeStripeApi.mjs, test-only and refused in production) so the whole order flow —
 * payment, staff, pickup, review — still runs in CI.
 */
const PORT = 4176;
const FAKE_STRIPE_PORT = 12111;
const baseURL = `http://localhost:${PORT}`;
export const TEST_CLOCK_START = '2026-10-05T12:00:00+03:00';
const DB = 'node_modules/.tmp/e2e-server.db';

const realStripe = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false;
if (!realStripe) {
  // Shared with the test workers (they inherit the runner's environment).
  process.env.STRIPE_SECRET_KEY = 'sk_test_e2e_fake';
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_e2e_fake';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_e2e_fake';
  process.env.STRIPE_API_BASE = `http://127.0.0.1:${FAKE_STRIPE_PORT}`;
}
process.env.E2E_ADMIN_EMAIL = 'admin@e2e.test';
process.env.E2E_ADMIN_PASSWORD = 'e2e admin password 42';

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
  webServer: [
    ...(realStripe
      ? []
      : [
          {
            command: 'node e2e-server/fakeStripeApi.mjs',
            url: `http://127.0.0.1:${FAKE_STRIPE_PORT}/health`,
            reuseExistingServer: false,
            env: { FAKE_STRIPE_PORT: String(FAKE_STRIPE_PORT) },
          },
        ]),
    {
      command:
        `rm -f ${DB} ${DB}-wal ${DB}-shm && ` +
        'npx vite build --outDir dist-live && npm run server:build && ' +
        // The owner creates staff accounts with the CLI — so do the tests.
        'npm run -s server:cli -- staff:add --email "$E2E_ADMIN_EMAIL" --name "E2E Admin" --role admin && ' +
        'npm run server:start',
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
        SUSHIRIGA_STAFF_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
        TEST_CLOCK_START,
      },
    },
  ],
});
