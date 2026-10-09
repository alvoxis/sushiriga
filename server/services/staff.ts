import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { StaffRole, StaffUser } from '@/types';
import type { Store, StoredStaffUser } from '../db/store';
import {
  DUMMY_HASH,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from '../security/passwords';

/** Staff stay signed in for one working day. */
export const SESSION_TTL_MS = 12 * 60 * 60_000;

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export class StaffError extends Error {
  constructor(
    readonly code: 'invalid-email' | 'weak-password' | 'email-taken' | 'not-found',
    message: string,
  ) {
    super(message);
    this.name = 'StaffError';
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');
const publicUser = ({ id, email, name, role }: StoredStaffUser): StaffUser => ({
  id,
  email,
  name,
  role,
});

/**
 * Staff accounts and sign-in. Accounts are created by the owner with the CLI; there is no
 * self sign-up. Session tokens are random (256 bits) and only their hash is stored.
 */
export function createStaffService(store: Store, now: () => Date) {
  return {
    async createUser(input: {
      email: string;
      name: string;
      role: StaffRole;
      password: string;
    }): Promise<StaffUser> {
      const email = input.email.trim().toLowerCase();
      if (!EMAIL.test(email)) throw new StaffError('invalid-email', 'Invalid e-mail address');
      if (input.password.length < MIN_PASSWORD_LENGTH) {
        throw new StaffError(
          'weak-password',
          `The password must have at least ${MIN_PASSWORD_LENGTH} characters`,
        );
      }
      if (store.staff.findByEmail(email)) {
        throw new StaffError('email-taken', 'A staff account with this e-mail exists');
      }
      const user = {
        id: randomUUID(),
        email,
        name: input.name.trim() || email,
        role: input.role,
        passwordHash: await hashPassword(input.password),
        createdAt: now().toISOString(),
      };
      store.staff.insert(user);
      return publicUser({ ...user, disabled: false });
    },

    async setPassword(email: string, password: string): Promise<void> {
      const user = store.staff.findByEmail(email.trim().toLowerCase());
      if (!user) throw new StaffError('not-found', 'No such staff account');
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new StaffError(
          'weak-password',
          `The password must have at least ${MIN_PASSWORD_LENGTH} characters`,
        );
      }
      store.staff.setPassword(user.id, await hashPassword(password));
      store.sessions.deleteForUser(user.id); // sign out everywhere
    },

    setDisabled(email: string, disabled: boolean): void {
      const user = store.staff.findByEmail(email.trim().toLowerCase());
      if (!user) throw new StaffError('not-found', 'No such staff account');
      store.staff.setDisabled(user.id, disabled);
      if (disabled) store.sessions.deleteForUser(user.id);
    },

    list: () =>
      store.staff.list().map((user) => ({ ...publicUser(user), disabled: user.disabled })),

    /** Returns a session token, or null for wrong credentials (same answer for every reason). */
    async login(
      email: string,
      password: string,
    ): Promise<{ token: string; user: StaffUser } | null> {
      const user = store.staff.findByEmail(email.trim().toLowerCase());
      const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid || user.disabled) return null;
      const token = randomBytes(32).toString('base64url');
      const at = now();
      store.sessions.deleteExpired(at);
      store.sessions.insert(hashToken(token), user.id, at, new Date(at.getTime() + SESSION_TTL_MS));
      return { token, user: publicUser(user) };
    },

    authenticate(token: string | undefined): StaffUser | null {
      if (!token) return null;
      const session = store.sessions.find(hashToken(token));
      if (!session || Date.parse(session.expiresAt) <= now().getTime()) return null;
      const user = store.staff.find(session.userId);
      return user && !user.disabled ? publicUser(user) : null;
    },

    logout(token: string | undefined): void {
      if (token) store.sessions.delete(hashToken(token));
    },
  };
}

export type StaffService = ReturnType<typeof createStaffService>;
