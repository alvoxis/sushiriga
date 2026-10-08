// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const specialProducts: Product[] = [
  {
    id: 'oki-doki-16-plus-16',
    slug: 'oki-doki-16-plus-16',
    name: 'Oki Doki 16+16',
    sourceName: 'OKI DOKI. 16+16',
    category: 'special',
    ingredients: {
      lv: 'rīsi nori krēmsiers cepta laša sezama siera mērce ar unagi mērci 16 gab\nrīsi nori krēmsiers vistas melnais sezams ar unagi mērci 16 gab',
      ru: 'рис нори сливичный сыр жаренный лосось кунжут сырный соус с унаги соусом 16 штук\nрис нори сливичный сыр курица черным сезам с унаги соусом 16 штук',
      en: 'rice nori cream cheese fried salmon sesame cheese sauce with unagi sauce 16 pieces\nrice nori cream cheese chicken black sesame with unagi sauce 16 piece',
    },
    price: 2500,
    pieces: 32,
    available: true,
  },
];
