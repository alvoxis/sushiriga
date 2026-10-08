// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const dzerieniProducts: Product[] = [
  {
    id: 'coca-cola',
    slug: 'coca-cola',
    name: 'Coca-Cola',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
  },
  {
    id: 'coca-cola-zero',
    slug: 'coca-cola-zero',
    name: 'Coca-Cola Zero',
    category: 'dzerieni',
    price: 150,
    available: true,
  },
  {
    id: 'sprite',
    slug: 'sprite',
    name: 'Sprite',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
  },
  {
    id: 'fanta',
    slug: 'fanta',
    name: 'Fanta',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
  },
  {
    id: 'sparkling-mineral-water',
    slug: 'sparkling-mineral-water',
    name: 'Sparkling Mineral Water',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
    translations: {
      lv: {
        name: 'Minerālūdens gāzēts',
      },
    },
  },
  {
    id: 'mineral-water-still',
    slug: 'mineral-water-still',
    name: 'Mineral Water Still',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
    translations: {
      lv: {
        name: 'Minerālūdens negāzēts',
      },
    },
  },
];
