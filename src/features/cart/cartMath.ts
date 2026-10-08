import type {
  AppliedPromo,
  Cart,
  CartItem,
  CartLine,
  Cents,
  Product,
  SelectedOption,
} from '@/types';

export const MAX_QUANTITY = 99;

export function lineKey(productId: string, options?: SelectedOption[]): string {
  if (!options?.length) return productId;
  const serialized = [...options]
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((o) => `${o.optionId}=${o.valueId}`)
    .join('&');
  return `${productId}?${serialized}`;
}

function optionsDelta(product: Product, options?: SelectedOption[]): Cents {
  if (!options?.length || !product.options) return 0;
  return options.reduce((sum, selected) => {
    const option = product.options?.find((o) => o.id === selected.optionId);
    const value = option?.values.find((v) => v.id === selected.valueId);
    return sum + (value?.priceDelta ?? 0);
  }, 0);
}

/**
 * Resolves stored cart items against the catalog. Prices ALWAYS come from the catalog;
 * unknown or unavailable products are dropped. The discount is the one returned by the
 * promo service (final discount calculation belongs to the backend).
 */
export function buildCart(
  items: CartItem[],
  products: Product[],
  promo?: AppliedPromo | null,
): Cart {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || !product.available || item.quantity <= 0) continue;
    const unitPrice = product.price + optionsDelta(product, item.selectedOptions);
    lines.push({
      ...item,
      key: lineKey(item.productId, item.selectedOptions),
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = promo ? Math.min(Math.max(promo.discount, 0), subtotal) : 0;
  return {
    items: lines,
    subtotal,
    discount,
    total: subtotal - discount,
    ...(promo ? { promoCode: promo.code } : {}),
  };
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export type CartAction =
  | { type: 'add'; productId: string; quantity?: number; selectedOptions?: SelectedOption[] }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' };

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.productId, action.selectedOptions);
      const quantity = action.quantity ?? 1;
      const existing = items.find((i) => lineKey(i.productId, i.selectedOptions) === key);
      if (existing) {
        return items.map((i) =>
          i === existing ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QUANTITY) } : i,
        );
      }
      const item: CartItem = {
        productId: action.productId,
        quantity: Math.min(quantity, MAX_QUANTITY),
      };
      if (action.selectedOptions?.length) item.selectedOptions = action.selectedOptions;
      return [...items, item];
    }
    case 'setQuantity': {
      if (action.quantity <= 0) {
        return items.filter((i) => lineKey(i.productId, i.selectedOptions) !== action.key);
      }
      return items.map((i) =>
        lineKey(i.productId, i.selectedOptions) === action.key
          ? { ...i, quantity: Math.min(Math.floor(action.quantity), MAX_QUANTITY) }
          : i,
      );
    }
    case 'remove':
      return items.filter((i) => lineKey(i.productId, i.selectedOptions) !== action.key);
    case 'clear':
      return [];
  }
}
