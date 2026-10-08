import type { LocalizedText, Locale } from './i18n';
import type { Cents } from './money';

export type CategoryId =
  | 'sushi-burger'
  | 'poke'
  | 'nigiri-gunkan'
  | 'hosomaki'
  | 'rolli'
  | 'cepti-rolli'
  | 'tempura'
  | 'double-mix'
  | 'special'
  | 'sushi-seti'
  | 'dzerieni'
  | 'snacks'
  | 'sauces';

export interface Category {
  id: CategoryId;
  /** URL segment: /menu/:category */
  slug: string;
  name: LocalizedText & { lv: string };
  order: number;
  /** Hidden categories exist in data but are not shown to customers (e.g. seasonal pauses). */
  hidden?: boolean;
  /** Show the general "all sushi may contain …" allergen notice for this category. */
  sushiAllergenNotice?: boolean;
}

/** EU 14 allergen codes as used on the restaurant menu (A1–A14). */
export type AllergenCode =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'A9'
  | 'A10'
  | 'A11'
  | 'A12'
  | 'A13'
  | 'A14';

/** Labels shown on the source menu. */
export type ProductTag = 'hot' | 'warm' | 'featured' | 'includes-sauce';

export interface ProductImage {
  src: string;
  alt: LocalizedText;
  width: number;
  height: number;
}

export interface ProductTranslation {
  name?: string;
}

/** Future configurable options (size, sauce choice…). No product uses them yet. */
export interface ProductOption {
  id: string;
  name: LocalizedText;
  values: { id: string; name: LocalizedText; priceDelta: Cents }[];
  required: boolean;
}

/**
 * A menu item. Every optional field is optional because the source menu does not
 * provide it for every product — NEVER fill these with guessed values.
 */
export interface Product {
  id: string;
  slug: string;
  /** Display name: the source name with the menu number split off and Title Case applied. */
  name: string;
  /** The name exactly as written on the source menu (traceability; never shown or edited). */
  sourceName?: string;
  /** Menu number printed on the source menu (e.g. "31"). */
  number?: string;
  category: CategoryId;
  description?: LocalizedText;
  /** Ingredient list as free text per language (the source does not provide structured lists). */
  ingredients?: LocalizedText;
  /** For sets / mixes: the rolls included, verbatim from the source menu. */
  components?: string[];
  price: Cents;
  pieces?: number;
  /** Grams. */
  weight?: number;
  /** Millilitres (drinks). */
  volume?: number;
  /**
   * Confirmed allergens of THIS dish. `undefined` = unknown (not published by the restaurant).
   * Never derive this from ingredient text or from the general "all sushi may contain" notice.
   */
  allergens?: AllergenCode[];
  spicy?: boolean;
  vegetarian?: boolean;
  available: boolean;
  image?: ProductImage;
  tags?: ProductTag[];
  options?: ProductOption[];
  translations?: Partial<Record<Locale, ProductTranslation>>;
}
