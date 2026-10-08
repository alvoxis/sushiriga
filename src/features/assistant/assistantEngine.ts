import type { MessageKey } from '@/i18n';
import type { CategoryId, Product } from '@/types';
import { publicProducts, visibleCategories, type Catalog } from '@/features/menu/catalog';
import { normalizeSearch, productsMatchingAny } from '@/features/menu/search';

/**
 * Mock, rule-based assistant. It NEVER produces product names, prices or ingredients itself:
 * replies are translation keys + ids of real catalog products, rendered from catalog data.
 * A future LLM-backed assistant must keep the same contract (see services/assistant).
 */
export interface AssistantReply {
  textKey: MessageKey;
  /** Set when the reply is about a whole category (name is localized at render time). */
  categoryId?: CategoryId;
  recommendations: string[];
}

const MAX_RECOMMENDATIONS = 4;
const NON_FOOD = new Set(['dzerieni', 'sauces']);

/** Multilingual keyword groups (normalized: lower-case, no diacritics). */
const INGREDIENTS: Record<string, string[]> = {
  salmon: ['salmon', 'lasis', 'lasi', 'lasa', 'sake', 'лосос', 'ласос'],
  eel: ['eel', 'unagi', 'zutis', 'zuti', 'угор'],
  chicken: ['chicken', 'vista', 'vistu', 'кур'],
  shrimp: ['shrimp', 'prawn', 'ebi', 'garnel', 'кревет', 'криветк'],
  crab: ['crab', 'krab', 'краб'],
  avocado: ['avocado', 'avokado', 'avakado', 'авокадо', 'авакадо'],
  cucumber: ['cucumber', 'gurki', 'огур'],
  tuna: ['tuna', 'tunc', 'тунц'],
  spicy: ['spicy', 'spice', 'pikant', 'пикант', 'остр', 'спайс'],
  cheese: ['cheese', 'siers', 'siera', 'krems', 'сыр'],
};

const INTENTS = {
  vegetarian: ['vegetar', 'vegan', 'veget', 'вегет', 'веган'],
  allergy: ['allerg', 'alerg', 'аллерг', 'алерг', 'gluten', 'глютен', 'lipekl'],
  cheapest: ['cheap', 'affordable', 'budget', 'lets', 'leta', 'pieejam', 'дешев', 'недорог'],
  group: [
    'group',
    'party',
    'friends',
    'share',
    'set',
    'kompan',
    'komplekt',
    'draug',
    'компан',
    'сет',
    'друз',
  ],
  warm: ['warm', 'hot dish', 'silt', 'тепл', 'тёпл', 'горяч'],
};

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(normalizeSearch(w)));
}

function food(products: Product[]): Product[] {
  return products.filter((p) => p.available && !NON_FOOD.has(p.category));
}

function ids(products: Product[]): string[] {
  return products.slice(0, MAX_RECOMMENDATIONS).map((p) => p.id);
}

export function assistantReply(message: string, catalog: Catalog): AssistantReply {
  const text = normalizeSearch(message);
  const menu = publicProducts(catalog);

  if (hasAny(text, INTENTS.vegetarian))
    return { textKey: 'assistant.vegetarianUnknown', recommendations: [] };
  if (hasAny(text, INTENTS.allergy)) return { textKey: 'assistant.allergy', recommendations: [] };

  // 1. A dish mentioned by name.
  const named = menu.filter((p) => {
    const name = normalizeSearch(p.name);
    return name.length >= 4 && text.includes(name);
  });
  if (named.length) return { textKey: 'assistant.found', recommendations: ids(named) };

  // 2. Intents.
  if (hasAny(text, INTENTS.cheapest)) {
    const cheapest = [...food(menu)].sort((a, b) => a.price - b.price);
    return { textKey: 'assistant.cheapest', recommendations: ids(cheapest) };
  }
  if (hasAny(text, INTENTS.warm)) {
    const warm = food(menu).filter((p) => p.tags?.includes('warm'));
    if (warm.length) return { textKey: 'assistant.found', recommendations: ids(warm) };
  }
  if (hasAny(text, INTENTS.group)) {
    const sets = food(menu)
      .filter((p) => p.category === 'sushi-seti')
      .sort((a, b) => (b.pieces ?? 0) - (a.pieces ?? 0));
    return { textKey: 'assistant.group', recommendations: ids(sets) };
  }

  // 3. A category mentioned by name (in any language).
  for (const category of visibleCategories(catalog)) {
    const names = Object.values(category.name).map(normalizeSearch);
    if (names.some((n) => n.length >= 4 && text.includes(n))) {
      const inCategory = menu.filter((p) => p.category === category.id && p.available);
      return {
        textKey: 'assistant.foundCategory',
        categoryId: category.id,
        recommendations: ids(inCategory),
      };
    }
  }

  // 4. Ingredients: every mentioned ingredient must be present.
  const wanted = Object.values(INGREDIENTS).filter((synonyms) => hasAny(text, synonyms));
  if (wanted.length) {
    let matches = food(menu);
    for (const synonyms of wanted)
      matches = productsMatchingAny(matches, synonyms.map(normalizeSearch));
    if (matches.length) return { textKey: 'assistant.found', recommendations: ids(matches) };
  }

  return { textKey: 'assistant.none', recommendations: [] };
}
