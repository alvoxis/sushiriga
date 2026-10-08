export interface Session {
  customerId: string;
  name?: string;
  email?: string;
}

/**
 * Authentication abstraction. Registration is OPTIONAL: every flow must work with `null`.
 * A provider (Supabase, Auth0, custom backend…) will implement this later.
 */
export interface AuthService {
  readonly provider: string;
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
}

export function createGuestOnlyAuthService(): AuthService {
  return {
    provider: 'guest-only',
    getSession: async () => null,
    signOut: async () => undefined,
  };
}
