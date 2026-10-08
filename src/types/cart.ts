import type { Cents } from './money';

export interface SelectedOption {
  optionId: string;
  valueId: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
}

/** A cart item resolved against the catalog (prices always come from the catalog, never from storage). */
export interface CartLine extends CartItem {
  key: string;
  unitPrice: Cents;
  lineTotal: Cents;
}

export interface AppliedPromo {
  code: string;
  discount: Cents;
}

export interface Cart {
  items: CartLine[];
  subtotal: Cents;
  discount: Cents;
  total: Cents;
  promoCode?: string;
}
