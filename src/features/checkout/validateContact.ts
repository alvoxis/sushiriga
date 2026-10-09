import type { GuestContact } from '@/types';

export type ContactError = 'required' | 'name' | 'phone' | 'email';
export type ContactErrors = Partial<Record<keyof GuestContact, ContactError>>;

export const NAME_MAX = 80;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE_CHARS = /^\(?\+?[\d\s()-]+$/;

/** Digits of a phone number as typed ("+371 20 000 000" → "37120000000"). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Guest contact rules (no account needed):
 * - name: 2–80 characters;
 * - phone: digits with optional leading "+", spaces, brackets, dashes; 7–15 digits (E.164 max);
 * - e-mail: optional, but must look like an address when given.
 */
export function validateContact(contact: GuestContact): ContactErrors {
  const errors: ContactErrors = {};
  const name = contact.name.trim();
  if (!name) errors.name = 'required';
  else if (name.length < 2 || name.length > NAME_MAX) errors.name = 'name';

  const phone = contact.phone.trim();
  const digits = phoneDigits(phone).length;
  if (!phone) errors.phone = 'required';
  else if (!PHONE_CHARS.test(phone) || digits < 7 || digits > 15) errors.phone = 'phone';

  const email = contact.email?.trim();
  if (email && !EMAIL.test(email)) errors.email = 'email';
  return errors;
}

/** Cleaned contact data for the order (trimmed, empty e-mail dropped). */
export function normalizeContact(contact: GuestContact): GuestContact {
  const email = contact.email?.trim();
  return { name: contact.name.trim(), phone: contact.phone.trim(), ...(email ? { email } : {}) };
}
