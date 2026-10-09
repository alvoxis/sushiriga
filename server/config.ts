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
  };
}
