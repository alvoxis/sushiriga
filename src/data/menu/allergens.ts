import type { AllergenCode, LocalizedText } from '@/types';

/**
 * Allergen legend VERBATIM from the source menu (https://www.sushiriga.lv/menu, 2026-10-08).
 * Not corrected silently — known issues are listed in docs/MENU_DATA.md (e.g. A1 ru/en).
 */
export const allergens: Record<AllergenCode, LocalizedText> = {
  A1: { lv: 'Graudaugi, kas satur lipekli (glutēnu)', ru: 'Хлопья', en: 'Flakes' },
  A2: { lv: 'Vēžveidīgie un to produkti', ru: 'Ракообразные', en: 'Crustaceans' },
  A3: {
    lv: 'Olas un to produkti',
    ru: 'яйца и продукты из них',
    en: 'eggs and products made from them',
  },
  A4: { lv: 'Zivis un to produkti', ru: 'Рыба', en: 'fish' },
  A5: {
    lv: 'Zemesrieksti un to produkti',
    ru: 'Арахис и продукты из него',
    en: 'Peanuts and products made from them',
  },
  A6: { lv: 'Sojas pupas un to produkti', ru: 'соевые бобы', en: 'soybeans' },
  A7: {
    lv: 'Piens un tā produkti (ieskaitot laktozi)',
    ru: 'Молоко и его продукты',
    en: 'Milk and its products',
  },
  A8: { lv: 'Rieksti un to produkti', ru: 'Орехи', en: 'Nuts' },
  A9: {
    lv: 'Selerijas un to produkti',
    ru: 'Сельдерей и продукты из него',
    en: 'Celery and products made from it',
  },
  A10: {
    lv: 'Sinepes un to produkti',
    ru: 'Горчица и ее продукты',
    en: 'Mustard and its products',
  },
  A11: { lv: 'Sezama sēklas un to produkti', ru: 'семена кунжута', en: 'sesame seeds' },
  A12: {
    lv: 'Sēra dioksīds un sulfīti',
    ru: 'Диоксид серы и сульфиты',
    en: 'Sulfur dioxide and sulfites',
  },
  A13: { lv: 'Lupīna un tās produkti', ru: 'Люпин и его продукция', en: 'Lupine and its products' },
  A14: {
    lv: 'Gliemji un to produkti',
    ru: 'Моллюски и их продукты',
    en: 'Mollusks and their products',
  },
};

/**
 * General notice from the source menu: "Visi suši var saturēt / All sushi may contain
 * A1;A2;A3;A4;A6;A7;A10;A11". It is category-level information, NOT a per-dish allergen list.
 * Per-dish allergens are unknown until the restaurant confirms them — Product.allergens stays
 * undefined (= unknown), never guessed.
 */
export const SUSHI_MAY_CONTAIN: AllergenCode[] = ['A1', 'A2', 'A3', 'A4', 'A6', 'A7', 'A10', 'A11'];
