import { staticCatalog } from '@/services/catalog/catalogService';
import { assistantReply } from './assistantEngine';

const ids = new Set(staticCatalog.products.map((p) => p.id));

describe('mock assistant', () => {
  it.each([
    'something with salmon',
    'что-нибудь с курицей',
    'kaut ko ar zuti',
    'a set for a group',
    'cheapest please',
    'something warm',
    'tempura',
    'how much is Maestro?',
  ])('recommends only real catalog products: %s', (message) => {
    const reply = assistantReply(message, staticCatalog);
    expect(reply.recommendations.length).toBeGreaterThan(0);
    for (const id of reply.recommendations) expect(ids.has(id)).toBe(true);
  });

  it('matches every requested ingredient', () => {
    const reply = assistantReply('eel and cucumber', staticCatalog);
    for (const id of reply.recommendations) {
      const product = staticCatalog.products.find((p) => p.id === id)!;
      const text = JSON.stringify(product).toLowerCase();
      expect(text).toMatch(/eel|unagi|zutis/);
      expect(text).toMatch(/cucumber|gurķ/);
    }
  });

  it('does not guess vegetarian or allergen answers', () => {
    expect(assistantReply('vegetarian?', staticCatalog)).toEqual({
      textKey: 'assistant.vegetarianUnknown',
      recommendations: [],
    });
    expect(assistantReply('I have an allergy', staticCatalog).recommendations).toEqual([]);
  });

  it('admits when nothing matches', () => {
    expect(assistantReply('pizza margherita', staticCatalog)).toEqual({
      textKey: 'assistant.none',
      recommendations: [],
    });
  });
});
