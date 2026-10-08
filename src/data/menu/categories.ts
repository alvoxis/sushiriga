import type { Category } from '@/types';

/**
 * Menu categories, in the order of the source menu.
 * `name.lv` is the name from the project brief (+ Poke); ru/en are UI translations.
 */
export const categories: Category[] = [
  {
    id: 'sushi-burger',
    slug: 'sushi-burger',
    order: 1,
    name: { lv: 'Sushi Burger', ru: 'Суши-бургеры', en: 'Sushi Burger' },
    sushiAllergenNotice: true,
  },
  {
    // Confirmed by the owner (2026-10): Poke is shown as its own category (4 items on sushiriga.lv).
    id: 'poke',
    slug: 'poke',
    order: 2,
    name: { lv: 'Poke', ru: 'Поке', en: 'Poke' },
  },
  {
    id: 'nigiri-gunkan',
    slug: 'nigiri-gunkan',
    order: 3,
    name: { lv: 'Nigiri & Gunkan', ru: 'Нигири и гунканы', en: 'Nigiri & Gunkan' },
    sushiAllergenNotice: true,
  },
  {
    id: 'hosomaki',
    slug: 'hosomaki',
    order: 4,
    name: { lv: 'Hosomaki', ru: 'Хосомаки', en: 'Hosomaki' },
    sushiAllergenNotice: true,
  },
  {
    id: 'rolli',
    slug: 'rolli',
    order: 5,
    name: { lv: 'Rolli', ru: 'Роллы', en: 'Rolls' },
    sushiAllergenNotice: true,
  },
  {
    // The source menu itself translates "cepts" as "fried" (e.g. "cepts lasis" → "fried salmon").
    id: 'cepti-rolli',
    slug: 'cepti-rolli',
    order: 6,
    name: { lv: 'Cepti Rolli', ru: 'Жареные роллы', en: 'Fried Rolls' },
    sushiAllergenNotice: true,
  },
  {
    id: 'tempura',
    slug: 'tempura',
    order: 7,
    name: { lv: 'Tempura', ru: 'Темпура', en: 'Tempura' },
    sushiAllergenNotice: true,
  },
  {
    id: 'double-mix',
    slug: 'double-mix',
    order: 8,
    name: { lv: 'Double Mix 1+1', ru: 'Double Mix 1+1', en: 'Double Mix 1+1' },
    sushiAllergenNotice: true,
  },
  {
    id: 'special',
    slug: 'special',
    order: 9,
    name: { lv: 'Special', ru: 'Special', en: 'Special' },
    sushiAllergenNotice: true,
  },
  {
    id: 'sushi-seti',
    slug: 'sushi-seti',
    order: 10,
    name: { lv: 'Sushi Seti', ru: 'Суши-сеты', en: 'Sushi Sets' },
    sushiAllergenNotice: true,
  },
  {
    id: 'dzerieni',
    slug: 'dzerieni',
    order: 11,
    name: { lv: 'Dzērieni', ru: 'Напитки', en: 'Drinks' },
  },
  {
    id: 'snacks',
    slug: 'snacks',
    order: 12,
    name: { lv: 'Snacks', ru: 'Закуски', en: 'Snacks' },
  },
  {
    // TODO(copy): the project brief and the source both use a misspelling ("Souces" / "SOUSES").
    // Kept as given for lv; en/ru use the correct word. Confirm the final Latvian label.
    id: 'sauces',
    slug: 'souces',
    order: 13,
    name: { lv: 'Souces', ru: 'Соусы', en: 'Sauces' },
  },
];
