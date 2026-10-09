import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Crockford base32 without look-alike letters — readable over the phone at pickup. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % 32];
  return out;
}

/** Order id shown to the customer and staff, e.g. "SR-7K4Q-9M2X". 40 random bits. */
export function newOrderId(): string {
  const code = randomCode(8);
  return `SR-${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Opaque, unguessable id (128 bits). */
export function newSecretId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('base64url')}`;
}

/**
 * Guest orders have no account, so access to an order (status page, review) is granted by a
 * token: HMAC(secret, order id). It is returned once when the order is placed and kept by the
 * customer's browser. Nothing needs to be stored, and placing the same quote twice returns the
 * same token.
 */
export function createOrderTokens(secret: string) {
  const sign = (orderId: string) =>
    createHmac('sha256', secret).update(`order:${orderId}`).digest('base64url');
  return {
    issue: sign,
    verify(orderId: string, token: string | undefined | null): boolean {
      if (!token) return false;
      const expected = Buffer.from(sign(orderId));
      const given = Buffer.from(token);
      return given.length === expected.length && timingSafeEqual(given, expected);
    },
  };
}

export type OrderTokens = ReturnType<typeof createOrderTokens>;
