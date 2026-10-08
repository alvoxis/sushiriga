// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const tempuraProducts: Product[] = [
  {
    id: 'wakame-tempura',
    slug: 'wakame-tempura',
    name: 'Wakame Tempura',
    sourceName: '70. WAKAME TEMPURA',
    number: '70',
    category: 'tempura',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, avokado, cepts terijaki lasis, gurķis, wakame, tempura maisījums, panko, unagi mērce',
      ru: 'Рис, нори, сливочный сыр, авокадо, терияки лосось, огурец, вакаме, темпура, панко, унаги соус',
      en: 'Rice, nori, cream cheese, avocado, teriyaki salmon, cucumber, wakame, tempura, panko, unagi sauce',
    },
    price: 850,
    available: true,
  },
  {
    id: 'vistas-tempura',
    slug: 'vistas-tempura',
    name: 'Vistas Tempura',
    sourceName: '71 VISTAS TEMPURA',
    number: '71',
    category: 'tempura',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, vista, gurķis, baltais sezams, tempuras maisījums, panko, unagi mērce',
      ru: 'Рис, нори, сливочный сыр, курица, огурец, Сезам белый, темпура микс, панко, унаги соус',
      en: 'Rice, nori, cream cheese, chicken, cucumber, white sesame, tempura mix, panko, unagi sauce',
    },
    price: 700,
    available: true,
  },
  {
    id: 'sake-fry',
    slug: 'sake-fry',
    name: 'Sake Fry',
    sourceName: '72 SAKE FRY',
    number: '72',
    category: 'tempura',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, gurķis, lasis, japāņu omlete, tempuras maisījums, panko, unagi mērce',
      ru: 'Рис, Нори, сливочный сыр, огурец, лосось, томаго, темпура микс, панко, унаги соус',
      en: 'Rice, Nori, Cream Cheese, Cucumber, Salmon, Tomago, Tempura Mix, Panko, Unagi Sauce',
    },
    price: 750,
    available: true,
  },
  {
    id: 'unagi-crisp',
    slug: 'unagi-crisp',
    name: 'Unagi Crisp',
    sourceName: '73 UNAGI CRISP',
    number: '73',
    category: 'tempura',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, zutis, cepts terijaki lasis, gurķis, tempuras maisījums, panko, unagi mērce',
      ru: 'Рис, нори, сливочный сыр, угорь, лосось терияки, огурец, темпура микс, панко, унаги соус',
      en: 'Rice, nori, cream cheese, eel, salmon teriyaki, cucumber, tempura mix, panko, unagi sauce',
    },
    price: 850,
    available: true,
  },
  {
    id: 'ebi-panko',
    slug: 'ebi-panko',
    name: 'Ebi Panko',
    sourceName: '74 Ebi Panko',
    number: '74',
    category: 'tempura',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, avokado, tīģergarneles, tempuras maisījums, unagi mērce',
      ru: 'Рис, нори, сливочный сыр, авокадо, тигровый креветки, темпура микс, унаги соус',
      en: 'Rice, nori, cream cheese, avocado, tiger shrimp, tempura mix, unagi sauce',
    },
    price: 750,
    available: true,
  },
];
