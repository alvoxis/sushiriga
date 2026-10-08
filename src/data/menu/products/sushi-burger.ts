// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const sushiBurgerProducts: Product[] = [
  {
    id: 'vega-burger',
    slug: 'vega-burger',
    name: 'Vega Burger',
    category: 'sushi-burger',
    ingredients: {
      lv: 'Rīsi, nori, krabju nūjiņas, avokado, wakame, tempura maisījums, panko, unagi mērce',
      ru: 'Рис, нори, крабовые палочки, авокадо,вакаме салат, темпура микс, панко, унаги соус',
      en: 'Rice, nori, crab sticks, avocado, wakame salad, tempura mix, panko, unagi souce',
    },
    price: 900,
    available: true,
  },
  {
    id: 'chicken-burger',
    slug: 'chicken-burger',
    name: 'Chicken Burger',
    category: 'sushi-burger',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, vista, gurķis, tomāts, tempura maisījums, panko, unagi mērci',
      ru: 'Рис, нори, сливочный сыр, курица, огурец, помидор, темпура микс, панко, унаги соус',
      en: 'Rice, nori, cream cheese, chicken, cucumber, tomato, tempura mix, panko, unagi sauce',
    },
    price: 1150,
    available: true,
  },
  {
    id: 'salomon-burger',
    slug: 'salomon-burger',
    name: 'Salomon Burger',
    category: 'sushi-burger',
    ingredients: {
      lv: 'Rīsi, nori, krēmsiers, gurķis, avokado, mango, lasis, tempura maisījums, panko, unagi mērce',
      ru: 'Рис, нори, сливочный сыр, лосось, манго, огурец, авокадо, темпура микс, панко, унаги соус',
      en: 'Rice, nori, cream cheese, salmon, mango, cucumber, avocado, Tempura mix, panko, unagi sauce',
    },
    price: 1200,
    available: true,
  },
  {
    id: 'terijaki-burger',
    slug: 'terijaki-burger',
    name: 'Terijaki Burger',
    category: 'sushi-burger',
    ingredients: {
      lv: 'Rīsi nori krēmsiera salāti garneles gurķis cepts lasis teryaki, Tempra Mix un kraukšķīgs panku ar unagi mērci',
      ru: 'Рис нори крем сливочный сыр салатный креветки огурец жаренны лосось теряки, Tempra Mix и хрустящая панку с унаги соусом',
      en: 'Rice nori cream cheese salad shrimp cucumber fried salmon teryaki, Tempra Mix and crispy panku with unagi sauce',
    },
    price: 1150,
    available: true,
  },
  {
    id: 'ebi-burger',
    slug: 'ebi-burger',
    name: 'Ebi Burger',
    category: 'sushi-burger',
    ingredients: {
      lv: 'Rīsi nori avokado tīģergarneļu krēmsiers Tempura maisījums un kraukšķīgs panku ar unagi mērci',
      ru: 'Рис нори авокадо тигровый креветки сливочный сыр Темпура микс и хрустящая панку с унаги соусом',
      en: 'Rice nori avocado tiger prawns cream cheese tempura mix and crispy panku with unagi sauce',
    },
    price: 1150,
    available: true,
  },
];
