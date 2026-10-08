// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const snacksProducts: Product[] = [
  {
    id: 'king-prawns',
    slug: 'king-prawns',
    name: 'King Prawns',
    category: 'snacks',
    description: {
      lv: 'Zeltaini brūnas tīģergarneles ceptas rīvmaizē. Tiek pasniegtas ar vasabi aioli.',
      ru: 'Тигровые креветки обжаренные в сухарях до золотистого цвета. Подаются с васаби айоли.',
      en: 'Tiger prawns fried in breadcrumbs until golden. Served with wasabi aioli.',
    },
    price: 350,
    pieces: 6,
    available: true,
    tags: ['includes-sauce'],
  },
  {
    id: 'spring-rolls',
    slug: 'spring-rolls',
    name: 'Spring Rolls',
    category: 'snacks',
    description: {
      lv: 'Kraukšķīgie pavasara rullīši, pildīti ar dārzeņiem, no kuriem vienkārši nevar atrauties. .',
      ru: 'Хрустящие спринг-роллы с овощами, от которых невозможно оторваться.',
      en: "Crispy spring rolls filled with vegetables that you just can't stop eating.",
    },
    price: 300,
    pieces: 6,
    available: true,
    tags: ['includes-sauce'],
  },
  {
    id: 'french-fries-180g',
    slug: 'french-fries-180g',
    name: 'French Fries',
    category: 'snacks',
    description: {
      lv: 'Garšīgi, zeltaini, svaigi vārīti kartupeļi, nedaudz apkaisīti ar sāli. Tiek pasniegti',
      ru: 'Восхитительный, золотистый, свежеприготовленный картофель, слегка приправленный солью.',
      en: 'Delicious, golden, freshly prepared potatoes, lightly seasoned with salt.',
    },
    price: 250,
    weight: 180,
    available: true,
  },
  {
    id: 'fried-crispy-chicken-nuggets-6',
    slug: 'fried-crispy-chicken-nuggets-6',
    name: 'Fried Crispy Chicken Nuggets',
    category: 'snacks',
    price: 350,
    pieces: 6,
    available: true,
    tags: ['includes-sauce'],
  },
  {
    id: 'french-fries-230g',
    slug: 'french-fries-230g',
    name: 'French Fries',
    category: 'snacks',
    description: {
      lv: 'Garšīgi, zeltaini, svaigi vārīti kartupeļi, nedaudz apkaisīti ar sāli. Tiek pasniegti',
      ru: 'Восхитительный, золотистый, свежеприготовленный картофель, слегка приправленный солью.',
      en: 'Delicious, golden, freshly prepared potatoes, lightly seasoned with salt.',
    },
    price: 400,
    weight: 230,
    available: true,
  },
  {
    id: 'fried-crispy-chicken-nuggets-9',
    slug: 'fried-crispy-chicken-nuggets-9',
    name: 'Fried Crispy Chicken Nuggets',
    category: 'snacks',
    price: 450,
    pieces: 9,
    available: true,
    tags: ['includes-sauce'],
  },
];
