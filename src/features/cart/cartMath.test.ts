import type { Product } from '@/types';
import { buildCart, cartItemCount, cartReducer, lineKey, MAX_QUANTITY } from './cartMath';

const products: Product[] = [
  { id: 'a', slug: 'a', name: 'A', category: 'rolli', price: 1000, available: true },
  { id: 'b', slug: 'b', name: 'B', category: 'rolli', price: 750, available: true },
  { id: 'gone', slug: 'gone', name: 'Gone', category: 'rolli', price: 500, available: false },
];

describe('cartReducer', () => {
  it('adds items and merges the same product', () => {
    let items = cartReducer([], { type: 'add', productId: 'a' });
    items = cartReducer(items, { type: 'add', productId: 'a', quantity: 2 });
    expect(items).toEqual([{ productId: 'a', quantity: 3 }]);
  });

  it('changes quantity, removes at zero and caps at the maximum', () => {
    let items = cartReducer([], { type: 'add', productId: 'a' });
    items = cartReducer(items, { type: 'setQuantity', key: 'a', quantity: 5 });
    expect(items[0]?.quantity).toBe(5);
    items = cartReducer(items, { type: 'setQuantity', key: 'a', quantity: 1000 });
    expect(items[0]?.quantity).toBe(MAX_QUANTITY);
    items = cartReducer(items, { type: 'setQuantity', key: 'a', quantity: 0 });
    expect(items).toEqual([]);
  });

  it('removes and clears', () => {
    let items = cartReducer([], { type: 'add', productId: 'a' });
    items = cartReducer(items, { type: 'add', productId: 'b' });
    expect(cartReducer(items, { type: 'remove', key: 'a' })).toEqual([
      { productId: 'b', quantity: 1 },
    ]);
    expect(cartReducer(items, { type: 'clear' })).toEqual([]);
  });

  it('keys lines by product and sorted options', () => {
    expect(lineKey('a')).toBe('a');
    expect(
      lineKey('a', [
        { optionId: 'z', valueId: '1' },
        { optionId: 'b', valueId: '2' },
      ]),
    ).toBe('a?b=2&z=1');
  });
});

describe('buildCart', () => {
  it('calculates subtotal and total from catalog prices', () => {
    const cart = buildCart(
      [
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 1 },
      ],
      products,
    );
    expect(cart.subtotal).toBe(2750);
    expect(cart.discount).toBe(0);
    expect(cart.total).toBe(2750);
    expect(cart.items.map((l) => l.lineTotal)).toEqual([2000, 750]);
  });

  it('drops unknown and unavailable products', () => {
    const cart = buildCart(
      [
        { productId: 'nope', quantity: 1 },
        { productId: 'gone', quantity: 1 },
        { productId: 'a', quantity: 1 },
      ],
      products,
    );
    expect(cart.items).toHaveLength(1);
    expect(cart.total).toBe(1000);
  });

  it('applies a promo discount but never below zero', () => {
    const cart = buildCart([{ productId: 'b', quantity: 1 }], products, {
      code: 'X',
      discount: 5000,
    });
    expect(cart.discount).toBe(750);
    expect(cart.total).toBe(0);
    expect(cart.promoCode).toBe('X');
  });

  it('counts items', () => {
    expect(
      cartItemCount([
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 3 },
      ]),
    ).toBe(5);
  });
});
