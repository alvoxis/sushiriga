import { createContext, useContext } from 'react';
import type { AdminService } from '@/services/admin/adminService';
import type { StaffUser } from '@/types';

export interface AdminSession {
  user: StaffUser;
  admin: AdminService;
  /** Turns an error from the admin API into a message; signs out when the session ended. */
  describeError: (error: unknown) => string;
}

export const AdminContext = createContext<AdminSession | null>(null);

export function useAdmin(): AdminSession {
  const session = useContext(AdminContext);
  if (!session) throw new Error('useAdmin must be used inside the admin layout');
  return session;
}
