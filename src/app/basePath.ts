/**
 * Where the app is served from: "/" normally, "/sushiriga/" on GitHub Pages
 * (vite.config.ts → `base`). The router and every absolute URL must include it.
 */
export const BASE_PATH = import.meta.env.BASE_URL;

/** React Router basename: "/sushiriga" (no trailing slash) or "/". */
export const ROUTER_BASENAME = BASE_PATH.replace(/\/+$/, '') || '/';

/** Absolute URL of an app route, e.g. for payment providers that redirect back. */
export function absoluteAppUrl(path: string): string {
  const prefix = ROUTER_BASENAME === '/' ? '' : ROUTER_BASENAME;
  return `${window.location.origin}${prefix}${path}`;
}
