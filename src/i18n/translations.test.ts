import { translate } from './translate';
import { translations } from './translations';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('translations', () => {
  const reference = keys(translations.en).sort();

  it.each(['lv', 'ru'] as const)('%s has exactly the same keys as en', (locale) => {
    expect(keys(translations[locale]).sort()).toEqual(reference);
  });

  it.each(['lv', 'ru', 'en'] as const)('%s has no empty strings', (locale) => {
    for (const key of keys(translations[locale])) {
      expect(translate(translations[locale], key as never)).not.toBe('');
    }
  });

  it('interpolates parameters', () => {
    expect(translate(translations.en, 'book.pageOf', { current: 2, total: 5 })).toBe('Page 2 of 5');
    expect(translate(translations.ru, 'tips.title')).toBe('Подарить улыбку');
  });
});
