// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const nigiriGunkanProducts: Product[] = [
  {
    id: 'lasis-nigiri',
    slug: 'lasis-nigiri',
    name: 'Lasis Nigiri',
    sourceName: 'LASIS  NIGIRI',
    category: 'nigiri-gunkan',
    ingredients: {
      lv: 'Rīsi, lasis',
      ru: 'Рис, лосось',
      en: 'Rici, salmon',
    },
    price: 300,
    available: true,
  },
  {
    id: 'gourmed-nigiri',
    slug: 'gourmed-nigiri',
    name: 'Gourmed Nigiri',
    sourceName: 'GOURMED NIGIRI',
    category: 'nigiri-gunkan',
    ingredients: {
      lv: 'Rīsi, kūpināts lasis',
      ru: 'Рис, копчёный лосось',
      en: 'Rice, smoked salmon',
    },
    price: 300,
    available: true,
  },
  {
    id: 'unagi-nigiri',
    slug: 'unagi-nigiri',
    name: 'Unagi Nigiri',
    sourceName: 'UNAGI NIGIRI',
    category: 'nigiri-gunkan',
    ingredients: {
      lv: 'Rīsi, zutis',
      ru: 'Рис, угорь',
      en: 'Rici, eel',
    },
    price: 300,
    available: true,
  },
  {
    id: 'fried-salmon-nigiri',
    slug: 'fried-salmon-nigiri',
    name: 'Fried Salmon Nigiri',
    sourceName: 'FRIED SALMON NIGIRI',
    category: 'nigiri-gunkan',
    ingredients: {
      lv: 'Rīsi, cepts lasis',
      ru: 'Рис, лосось жареный',
      en: 'Rice, fried salmon',
    },
    price: 300,
    available: true,
  },
];
