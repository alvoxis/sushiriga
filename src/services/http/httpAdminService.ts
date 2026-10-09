import type {
  AdminOrder,
  AdminProduct,
  AdminReview,
  DaySummary,
  PromoCode,
  StaffUser,
} from '@/types';
import { AdminError, type AdminErrorCode, type AdminService } from '../admin/adminService';
import { ApiError, NetworkError, type HttpClient } from './httpClient';

/** Must match ADMIN_HEADER in server/http/adminRoutes.ts (CSRF protection). */
const ADMIN_HEADER = { 'X-SushiRiga-Admin': '1' };

const CODES: readonly AdminErrorCode[] = [
  'unauthorized',
  'invalid-credentials',
  'forbidden',
  'invalid-transition',
  'invalid-preparation-time',
  'invalid-promo',
  'refund-unavailable',
  'payment-provider-error',
  'too-many-requests',
  'not-found',
];

function toAdminError(error: unknown): AdminError {
  if (error instanceof NetworkError) return new AdminError('network', error.message);
  if (error instanceof ApiError) {
    return new AdminError(CODES.find((c) => c === error.code) ?? 'failed', error.message);
  }
  return new AdminError('failed', error instanceof Error ? error.message : 'Request failed');
}

export function createHttpAdminService(http: HttpClient): AdminService {
  const call = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      throw toAdminError(error);
    }
  };
  const get = <T>(path: string) => call(() => http.get<T>(`api/admin/${path}`));
  const post = <T>(path: string, body?: unknown) =>
    call(() => http.post<T>(`api/admin/${path}`, body ?? {}, { headers: ADMIN_HEADER }));
  const order = (id: string) => `orders/${encodeURIComponent(id)}`;

  return {
    async me() {
      try {
        return await get<StaffUser>('me');
      } catch (error) {
        if (error instanceof AdminError && error.code === 'unauthorized') return null;
        throw error;
      }
    },
    login: (email, password) => post<StaffUser>('login', { email, password }),
    logout: async () => {
      await post<void>('logout');
    },
    orders: (status) =>
      get<AdminOrder[]>(`orders${status?.length ? `?status=${status.join(',')}` : ''}`),
    accept: (id, preparationTime) => post<AdminOrder>(`${order(id)}/accept`, { preparationTime }),
    setStatus: (id, status, note) =>
      post<AdminOrder>(`${order(id)}/status`, { status, ...(note ? { note } : {}) }),
    setPreparationTime: (id, minutes) =>
      post<AdminOrder>(`${order(id)}/preparation-time`, { minutes }),
    summary: () => get<DaySummary>('summary'),
    menu: () => get<AdminProduct[]>('menu'),
    setProduct: (productId, change) =>
      post<AdminProduct>(`menu/${encodeURIComponent(productId)}`, change),
    promoCodes: () => get<PromoCode[]>('promo-codes'),
    savePromoCode: (promo) => post<PromoCode>('promo-codes', promo),
    reviews: (status) => get<AdminReview[]>(`reviews?status=${status}`),
    moderateReview: (id, status) =>
      post<AdminReview>(`reviews/${encodeURIComponent(id)}`, { status }),
  };
}
