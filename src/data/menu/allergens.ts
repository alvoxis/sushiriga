import type { AllergenCode, LocalizedText } from '@/types';

/** Allergen codes exactly as listed on the source menu (EU Regulation 1169/2011 list). */
export const allergens: Record<AllergenCode, LocalizedText> = {
  A1: {
    lv: 'Graudaugi, kas satur lipekli (glutēnu)',
    ru: 'Злаки, содержащие глютен',
    en: 'Cereals containing gluten',
  },
  A2: { lv: 'Vēžveidīgie un to produkti', ru: 'Ракообразные', en: 'Crustaceans' },
  A3: {
    lv: 'Olas un to produkti',
    ru: 'Яйца и продукты из них',
    en: 'Eggs and products made from them',
  },
  A4: { lv: 'Zivis un to produkti', ru: 'Рыба', en: 'Fish' },
  A5: {
    lv: 'Zemesrieksti un to produkti',
    ru: 'Арахис и продукты из него',
    en: 'Peanuts and products made from them',
  },
  A6: { lv: 'Sojas pupas un to produkti', ru: 'Соевые бобы', en: 'Soybeans' },
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
    ru: 'Горчица и её продукты',
    en: 'Mustard and its products',
  },
  A11: { lv: 'Sezama sēklas un to produkti', ru: 'Семена кунжута', en: 'Sesame seeds' },
  A12: {
    lv: 'Sēra dioksīds un sulfīti',
    ru: 'Диоксид серы и сульфиты',
    en: 'Sulphur dioxide and sulphites',
  },
  A13: { lv: 'Lupīna un tās produkti', ru: 'Люпин и его продукция', en: 'Lupin and its products' },
  A14: {
    lv: 'Gliemji un to produkti',
    ru: 'Моллюски и их продукты',
    en: 'Molluscs and their products',
  },
};

/**
 * Source menu: "Visi suši var saturēt / All sushi may contain A1;A2;A3;A4;A6;A7;A10;A11".
 * Shown for categories with `sushiAllergenNotice`. Per-product allergens are not published
 * by the restaurant yet — TODO(owner): provide them; until then Product.allergens stays empty.
 */
export const SUSHI_MAY_CONTAIN: AllergenCode[] = ['A1', 'A2', 'A3', 'A4', 'A6', 'A7', 'A10', 'A11'];
