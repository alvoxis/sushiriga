import type { Messages } from './translations';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & (string | number)]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & (string | number)];

/** Every valid translation key, e.g. "cart.promo.errors.expired". */
export type MessageKey = Leaves<Messages>;
export type MessageParams = Record<string, string | number>;

export function translate(messages: Messages, key: MessageKey, params?: MessageParams): string {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== 'string') return key;
  if (!params) return node;
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
