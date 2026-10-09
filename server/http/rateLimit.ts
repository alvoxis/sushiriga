import type { MiddlewareHandler } from 'hono';
import { apiError } from './errors';

export interface RateLimitOptions {
  /** Bucket name, so different endpoints have separate budgets. */
  name: string;
  limit: number;
  windowMs: number;
  clientKey: (c: Parameters<MiddlewareHandler>[0]) => string;
  now?: () => number;
}

/**
 * Fixed-window, in-memory rate limit per client IP. Good enough for a single server process;
 * with several instances, move the counters to a shared store (e.g. Redis).
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = now();

  return async (c, next) => {
    const at = now();
    if (at - lastSweep > options.windowMs) {
      for (const [key, window] of windows) if (window.resetAt <= at) windows.delete(key);
      lastSweep = at;
    }
    const key = `${options.name}:${options.clientKey(c)}`;
    let window = windows.get(key);
    if (!window || window.resetAt <= at) {
      window = { count: 0, resetAt: at + options.windowMs };
      windows.set(key, window);
    }
    window.count += 1;
    if (window.count > options.limit) {
      c.header('Retry-After', String(Math.ceil((window.resetAt - at) / 1000)));
      return apiError(c, 429, 'too-many-requests', 'Too many requests, please try again later');
    }
    await next();
  };
}
