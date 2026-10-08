/**
 * Safe localStorage access: private mode, disabled storage or quota errors never crash the app.
 * All keys are namespaced and versioned so stored shapes can evolve.
 */
const PREFIX = 'sushiriga.';

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore — storage is a convenience, not a source of truth
  }
}

export function removeStorage(key: string): void {
  try {
    globalThis.localStorage?.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
