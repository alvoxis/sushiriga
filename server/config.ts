import { randomBytes } from 'node:crypto';

/**
 * Server configuration from environment variables. These are SERVER-ONLY secrets/settings:
 * they are never bundled into the frontend (unlike VITE_* variables).
 */
export interface ServerConfig {
  production: boolean;
  host: string;
  port: number;
  /** SQLite file. ":memory:" for tests. */
  databasePath: string;
  /** HMAC key for guest order access tokens. Changing it invalidates existing order links. */
  orderTokenSecret: string;
  /** Extra origins allowed to call the API from a browser (the SPA's own origin needs none). */
  corsOrigins: string[];
  /** Built frontend to serve (SPA). null = API only. */
  publicDir: string | null;
  /** Read the client IP from X-Forwarded-For (only behind a trusted reverse proxy). */
  trustProxy: boolean;
  /**
   * End-to-end tests only: the server clock starts at this moment (and keeps running), so
   * pickup-time rules are deterministic. Refused in production.
   */
  testClockStart?: Date;
  /** Stripe keys — all three or none. null = online payment is not offered. */
  stripe: StripeConfig | null;
}

export interface StripeConfig {
  /** sk_… or restricted rk_… — server only. */
  secretKey: string;
  /** whsec_… — verifies webhook signatures. */
  webhookSecret: string;
  /** pk_… — public, handed to the browser for the Payment Element. */
  publishableKey: string;
  /**
   * End-to-end tests only: send Stripe API calls to a local stand-in (e.g. http://127.0.0.1:12111)
   * instead of api.stripe.com. Refused in production.
   */
  apiBase?: string;
}

function readStripe(env: NodeJS.ProcessEnv, production: boolean): StripeConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? '';
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';
  const publishableKey = env.STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  const given = [secretKey, webhookSecret, publishableKey].filter(Boolean).length;
  if (given === 0) return null;
  if (given < 3) {
    throw new ConfigError(
      'Set all of STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_PUBLISHABLE_KEY (or none).',
    );
  }
  if (!/^(sk|rk)_(test|live)_/.test(secretKey)) {
    throw new ConfigError('STRIPE_SECRET_KEY must be a secret (sk_…) or restricted (rk_…) key');
  }
  if (!publishableKey.startsWith('pk_')) {
    throw new ConfigError('STRIPE_PUBLISHABLE_KEY must be a publishable key (pk_…)');
  }
  if (!webhookSecret.startsWith('whsec_')) {
    throw new ConfigError('STRIPE_WEBHOOK_SECRET must be a webhook signing secret (whsec_…)');
  }
  const secretLive = secretKey.includes('_live_');
  if (secretLive !== publishableKey.startsWith('pk_live_')) {
    throw new ConfigError('Stripe keys mix test and live mode');
  }
  if (production && !secretLive) {
    console.warn('[config] Stripe is in TEST mode: no real money will be charged.');
  }
  const apiBase = env.STRIPE_API_BASE?.trim();
  if (apiBase && production)
    throw new ConfigError('STRIPE_API_BASE must never be set in production');
  return { secretKey, webhookSecret, publishableKey, ...(apiBase ? { apiBase } : {}) };
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const MIN_SECRET_LENGTH = 32;

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`PORT must be a port number, got "${env.PORT}"`);
  }

  let orderTokenSecret = env.ORDER_TOKEN_SECRET?.trim() ?? '';
  if (orderTokenSecret.length < MIN_SECRET_LENGTH) {
    if (production || orderTokenSecret) {
      throw new ConfigError(
        `ORDER_TOKEN_SECRET must be set to at least ${MIN_SECRET_LENGTH} random characters ` +
          '(e.g. `openssl rand -base64 48`).',
      );
    }
    // Development only: a per-process secret. Order links stop working after a restart.
    orderTokenSecret = randomBytes(48).toString('base64url');
    console.warn('[config] ORDER_TOKEN_SECRET is not set — using a temporary development secret.');
  }

  let testClockStart: Date | undefined;
  if (env.TEST_CLOCK_START) {
    if (production) throw new ConfigError('TEST_CLOCK_START must never be set in production');
    testClockStart = new Date(env.TEST_CLOCK_START);
    if (Number.isNaN(testClockStart.getTime())) {
      throw new ConfigError(`TEST_CLOCK_START is not a date: "${env.TEST_CLOCK_START}"`);
    }
  }

  return {
    production,
    host: env.HOST?.trim() || '0.0.0.0',
    port,
    databasePath: env.DATABASE_PATH?.trim() || './data/sushiriga.db',
    orderTokenSecret,
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    publicDir: env.PUBLIC_DIR === '' ? null : (env.PUBLIC_DIR?.trim() ?? './dist'),
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    ...(testClockStart ? { testClockStart } : {}),
    stripe: readStripe(env, production),
  };
}
