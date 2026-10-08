import { createContext, useContext } from 'react';
import type { AppliedPromo, Cart, CartItem, SelectedOption } from '@/types';

export interface CartContextValue {
  /** Raw stored items (productId + quantity + options). */
  items: CartItem[];
  /** Cart resolved against the catalog, with totals. */
  cart: Cart;
  itemCount: number;
  promo: AppliedPromo | null;
  add: (productId: string, quantity?: number, selectedOptions?: SelectedOption[]) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setPromo: (promo: AppliedPromo | null) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
