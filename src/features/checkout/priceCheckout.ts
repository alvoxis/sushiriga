import { buildCart, MAX_QUANTITY } from '@/features/cart/cartMath';
import { checkPickupTime, type PickupTimeProblem } from '@/features/pickup/pickupSlots';
import { STANDARD_PREPARATION_MINUTES } from '@/features/pickup/preparationTime';
import { evaluatePromo, normalizePromoCode } from '@/features/promo/evaluatePromo';
import { MAX_CUSTOM_TIP } from '@/features/tips/tips';
import { OrderError } from '@/services/orders/orderService';
import type {
  CheckoutQuote,
  CheckoutRequest,
  Location,
  OrderItem,
  Product,
  PromoCode,
} from '@/types';
import { validateContact } from './validateContact';

export interface PricingContext {
  products: Product[];
  locations: Location[];
  findPromo: (code: string) => PromoCode | undefined;
  now: Date;
}

export type PricedCheckout = Omit<CheckoutQuote, 'quoteId'>;

/**
 * Prices a checkout request from the catalog and promo rules — the server's job. Shared by the
 * backend (`server/`) and the in-browser demo backend so both apply exactly the same rules.
 * Anything the client might add (prices, totals) is ignored: only ids and quantities are read.
 */
export function priceCheckout(request: CheckoutRequest, ctx: PricingContext): PricedCheckout {
  const { items, tip, locationId, pickupTime } = request;
  if (!items.length) throw new OrderError('invalid-request', 'Cart is empty');
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      throw new OrderError('invalid-request', `Invalid quantity for ${item.productId}`);
    }
    const product = ctx.products.find((p) => p.id === item.productId);
    if (!product?.available) {
      throw new OrderError('unavailable-product', `Product ${item.productId} is not available`);
    }
  }
  if (!Number.isInteger(tip) || tip < 0 || tip > MAX_CUSTOM_TIP) {
    throw new OrderError('invalid-request', 'Invalid tip');
  }
  if (!ctx.locations.some((l) => l.id === locationId && l.active)) {
    throw new OrderError('invalid-request', 'Unknown pickup location');
  }
  if (pickupTime !== 'asap' && Number.isNaN(Date.parse(pickupTime))) {
    throw new OrderError('invalid-request', 'Invalid pickup time');
  }

  const cart = buildCart(items, ctx.products);
  const lines: OrderItem[] = cart.items.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    ...(line.selectedOptions ? { selectedOptions: line.selectedOptions } : {}),
    name: ctx.products.find((p) => p.id === line.productId)?.name ?? line.productId,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }));

  let discount = 0;
  let promoCode: string | undefined;
  let promoRejected: CheckoutQuote['promoRejected'];
  if (request.promoCode) {
    const code = normalizePromoCode(request.promoCode);
    const customerId =
      request.customer.type === 'registered' ? request.customer.customerId : undefined;
    const result = evaluatePromo(ctx.findPromo(code), code, {
      subtotal: cart.subtotal,
      now: ctx.now,
      ...(customerId ? { customerId } : {}),
    });
    if (result.valid) {
      discount = result.discount;
      promoCode = result.code;
    } else {
      promoRejected = result.reason;
    }
  }

  return {
    items: lines,
    subtotal: cart.subtotal,
    discount,
    tip,
    total: cart.subtotal - discount + tip,
    ...(promoCode ? { promoCode } : {}),
    ...(promoRejected ? { promoRejected } : {}),
  };
}

/**
 * What the real backend checks on top of pricing: guest contact rules and that the pickup time is
 * one the restaurant can actually meet right now (same rules the checkout form shows).
 */
export function checkCheckoutDetails(
  request: CheckoutRequest,
  location: Location,
  now: Date,
): { contact: boolean; pickup: PickupTimeProblem | null } {
  return {
    contact: Object.keys(validateContact(request.customer)).length === 0,
    pickup: checkPickupTime(location, now, STANDARD_PREPARATION_MINUTES, request.pickupTime),
  };
}
