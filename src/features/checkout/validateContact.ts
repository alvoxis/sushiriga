import type { GuestContact } from '@/types';

export type ContactErrors = Partial<Record<keyof GuestContact, 'required' | 'phone' | 'email'>>;

const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(contact: GuestContact): ContactErrors {
  const errors: ContactErrors = {};
  if (!contact.name.trim()) errors.name = 'required';
  if (!contact.phone.trim()) errors.phone = 'required';
  else if (!PHONE.test(contact.phone.trim())) errors.phone = 'phone';
  if (contact.email?.trim() && !EMAIL.test(contact.email.trim())) errors.email = 'email';
  return errors;
}
