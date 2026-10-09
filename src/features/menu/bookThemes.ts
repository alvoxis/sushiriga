import type { CSSProperties } from 'react';
import type { CoverPattern } from '@/components/book';
import type { CategoryId } from '@/types';

/**
 * Visual identity of each category "book" — presentation only, never menu data.
 * Deep, restrained cloth colours with a gold-foil pattern; each chapter is recognisable on the
 * shelf and in the book without adding stereotypes (no dragons, no random characters).
 */
export interface BookTheme {
  /** Cloth colour of the cover and spine. */
  cloth: string;
  pattern: CoverPattern;
}

export const MENU_BOOK_THEME: BookTheme = { cloth: '#1f2c45', pattern: 'seigaiha' };

const THEMES: Record<CategoryId, BookTheme> = {
  'sushi-burger': { cloth: '#2c3b30', pattern: 'kikko' },
  poke: { cloth: '#1f3c43', pattern: 'seigaiha' },
  'nigiri-gunkan': { cloth: '#22304a', pattern: 'shippo' },
  hosomaki: { cloth: '#3d2f29', pattern: 'linen' },
  rolli: { cloth: '#2a2e47', pattern: 'seigaiha' },
  'cepti-rolli': { cloth: '#56291f', pattern: 'kikko' },
  tempura: { cloth: '#4a3a1e', pattern: 'shippo' },
  'double-mix': { cloth: '#2d3a39', pattern: 'linen' },
  special: { cloth: '#3a2241', pattern: 'seigaiha' },
  'sushi-seti': { cloth: '#1b2738', pattern: 'kikko' },
  dzerieni: { cloth: '#25423b', pattern: 'shippo' },
  snacks: { cloth: '#46331f', pattern: 'linen' },
  sauces: { cloth: '#3b1f23', pattern: 'shippo' },
};

export function bookTheme(category: CategoryId): BookTheme {
  return THEMES[category];
}

/** CSS custom properties consumed by Book, BookCover, BookSpine and placeholders. */
export function themeStyle(theme: BookTheme): CSSProperties {
  return { '--cover': theme.cloth } as CSSProperties;
}
