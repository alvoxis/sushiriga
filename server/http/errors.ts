import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { OrderError, type OrderErrorCode } from '@/services/orders/orderService';
import { PaymentProviderError, WebhookSignatureError } from '../payments/gateway';
import { AdminError, type AdminErrorCode } from '../services/admin';
import { PaymentError } from '../services/payments';
import { ReviewError } from '../services/reviews';

/** Every API error has the same shape: `{ error: { code, message } }`. Never a stack trace. */
export function apiError(c: Context, status: ContentfulStatusCode, code: string, message: string) {
  return c.json({ error: { code, message } }, status);
}

const ORDER_STATUS: Record<OrderErrorCode, ContentfulStatusCode> = {
  'invalid-request': 400,
  'invalid-contact': 400,
  'pickup-unavailable': 409,
  'unavailable-product': 409,
  'quote-not-found': 404,
  'order-not-found': 404,
  'payment-not-confirmed': 409,
  'too-many-requests': 429,
  network: 502,
  'not-connected': 503,
};

const REVIEW_STATUS: Record<ReviewError['code'], ContentfulStatusCode> = {
  'invalid-review': 400,
  'not-picked-up': 409,
  'already-reviewed': 409,
};

const ADMIN_STATUS: Record<AdminErrorCode, ContentfulStatusCode> = {
  'not-found': 404,
  'invalid-transition': 409,
  'invalid-preparation-time': 400,
  'invalid-promo': 400,
  'refund-unavailable': 409,
};

/** Maps domain errors to HTTP; anything unexpected becomes a generic 500 (and is logged). */
export function handleError(error: unknown, c: Context) {
  if (error instanceof OrderError) {
    return apiError(c, ORDER_STATUS[error.code], error.code, error.message);
  }
  if (error instanceof ReviewError) {
    return apiError(c, REVIEW_STATUS[error.code], error.code, error.message);
  }
  if (error instanceof AdminError) {
    return apiError(c, ADMIN_STATUS[error.code], error.code, error.message);
  }
  if (error instanceof PaymentError) {
    const status = error.code === 'payments-unavailable' ? 503 : 409;
    return apiError(c, status, error.code, error.message);
  }
  if (error instanceof PaymentProviderError) {
    return apiError(c, 502, 'payment-provider-error', error.message);
  }
  if (error instanceof WebhookSignatureError) {
    return apiError(c, 400, 'invalid-signature', error.message);
  }
  if (error instanceof HTTPException) {
    // Thrown by Hono middleware, e.g. the body size limit (413).
    const code = error.status === 413 ? 'payload-too-large' : 'http-error';
    return apiError(c, error.status as ContentfulStatusCode, code, error.message || code);
  }
  console.error('[api] unexpected error', error);
  return apiError(c, 500, 'internal', 'Something went wrong');
}
