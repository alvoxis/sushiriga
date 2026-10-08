/**
 * Public runtime configuration (VITE_* variables are embedded in the frontend bundle —
 * they must never contain secrets).
 */
export interface AppConfig {
  apiUrl: string | null;
  stripePublicKey: string | null;
  authProvider: string | null;
  aiProvider: string;
  /** No backend configured → all services run as local mocks. */
  demoMode: boolean;
}

function value(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export function readConfig(env: Record<string, string | undefined> = import.meta.env): AppConfig {
  const apiUrl = value(env.VITE_API_URL);
  return {
    apiUrl,
    stripePublicKey: value(env.VITE_STRIPE_PUBLIC_KEY),
    authProvider: value(env.VITE_AUTH_PROVIDER),
    aiProvider: value(env.VITE_AI_PROVIDER) ?? 'mock',
    demoMode: apiUrl === null,
  };
}
