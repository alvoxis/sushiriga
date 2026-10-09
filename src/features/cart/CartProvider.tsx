import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { useCatalog } from '@/features/menu/CatalogContext';
import type { AppliedPromo, CartItem } from '@/types';
import { readStorage, writeStorage } from '@/utils/storage';
import { buildCart, cartItemCount, cartReducer } from './cartMath';
import { CartContext, type CartContextValue } from './CartContext';

export const CART_STORAGE_KEY = 'cart.v1';

function isCartItem(value: unknown): value is CartItem {
  const item = value as CartItem;
  return (
    typeof item?.productId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0
  );
}

function loadItems(): CartItem[] {
  const stored = readStorage<unknown>(CART_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter(isCartItem) : [];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useCatalog();
  const [items, dispatch] = useReducer(cartReducer, undefined, loadItems);
  // A promo code is validated by the PromoService for a given subtotal; it is dropped whenever the
  // cart changes so a stale discount is never shown (the user simply re-applies it).
  const [promo, setPromoState] = useState<AppliedPromo | null>(null);

  useEffect(() => writeStorage(CART_STORAGE_KEY, items), [items]);

  const add = useCallback<CartContextValue['add']>((productId, quantity, selectedOptions) => {
    dispatch({
      type: 'add',
      productId,
      ...(quantity ? { quantity } : {}),
      ...(selectedOptions ? { selectedOptions } : {}),
    });
    setPromoState(null);
  }, []);
  const setQuantity = useCallback((key: string, quantity: number) => {
    dispatch({ type: 'setQuantity', key, quantity });
    setPromoState(null);
  }, []);
  const remove = useCallback((key: string) => {
    dispatch({ type: 'remove', key });
    setPromoState(null);
  }, []);
  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
    setPromoState(null);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const cart = buildCart(items, products, promo);
    return {
      items,
      cart,
      // Count only lines that resolve to available catalog products (what the cart page shows).
      itemCount: cartItemCount(cart.items),
      promo,
      add,
      setQuantity,
      remove,
      clear,
      setPromo: setPromoState,
    };
  }, [items, products, promo, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
