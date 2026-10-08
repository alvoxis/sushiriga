// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —
// see docs/MENU_DATA.md before editing. Prices are in euro cents.
import type { Product } from '@/types';

export const pokeProducts: Product[] = [
  {
    id: 'poke-salmon',
    slug: 'poke-salmon',
    name: 'Poke Salmon',
    sourceName: 'Poke Salmon',
    category: 'poke',
    ingredients: {
      lv: 'Lasis/Rīsi/Avokado/Waccame/Gurķi/Edamame/Ingvers',
      ru: 'Лосось/Рис/Авакадо/Ваккаме/Огурец/Эдамамэ/Имбирь',
      en: 'Salmon/Rice/Avocado/Wakame/Cucumber/Edamame/Ginger',
    },
    price: 1300,
    available: true,
  },
  {
    id: 'poke-eel',
    slug: 'poke-eel',
    name: 'Poke Eel',
    sourceName: 'Poke Eel',
    category: 'poke',
    ingredients: {
      lv: 'Zutis/Rīsi/Avokado/Vakame/Gurķis/Edamame/Ingvers',
      ru: 'Угорь/Рис/Авакадо/Ваккаме/Огурец/Эдамамэ/Имбирь',
      en: 'Eel/Rice/Avocado/Wakame/Cucumber/Edamame/Ginger',
    },
    price: 1400,
    available: true,
  },
  {
    id: 'poke-shrimp',
    slug: 'poke-shrimp',
    name: 'Poke Shrimp',
    sourceName: 'Poke Shrimp',
    category: 'poke',
    ingredients: {
      lv: 'Garneles/Rīsi/Avokado/Vakame/Gurķi/Edamame/Ingvers',
      ru: 'Креветки/Рис/Авакадо/Ваккаме/Огурец/Эдамамэ/Имбирь',
      en: 'Shrimp/Rice/Avocado/Wakame/Cucumber/Edamame/Ginger',
    },
    price: 1300,
    available: true,
  },
  {
    id: 'poke-chicken',
    slug: 'poke-chicken',
    name: 'Poke Chicken',
    sourceName: 'Poke Chicken',
    category: 'poke',
    ingredients: {
      lv: 'Vistas/Rīsi/Avokado/Vakame/Gurķi/Edamame/Ingvers',
      ru: 'Курица/Рис/Авакадо/Ваккаме/Огурец/Эдамамэ/Имбирь',
      en: 'Chicken/Rice/Avocado/Wakame/Cucumber/Edamame/Ginger',
    },
    price: 1300,
    available: true,
  },
];
