// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const dzerieniProducts: Product[] = [
  {
    id: 'coca-cola',
    slug: 'coca-cola',
    name: 'Coca-Cola',
    sourceName: 'Coca-Cola 0.33l',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
  },
  {
    id: 'coca-cola-zero',
    slug: 'coca-cola-zero',
    name: 'Coca-Cola Zero',
    sourceName: 'Coca-Cola zero',
    category: 'dzerieni',
    price: 150,
    available: true,
  },
  {
    id: 'sprite',
    slug: 'sprite',
    name: 'Sprite',
    sourceName: 'SPRITE 0.33l',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
  },
  {
    id: 'fanta',
    slug: 'fanta',
    name: 'Fanta',
    sourceName: 'FANTA 0.33l',
    category: 'dzerieni',
    price: 150,
    volume: 330,
    available: true,
  },
  {
    id: 'sparkling-mineral-water',
    slug: 'sparkling-mineral-water',
    name: 'Sparkling Mineral Water',
    sourceName: 'Sparkling mineral water 0.33l',
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
    sourceName: 'Mineral water still 0.33l',
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
