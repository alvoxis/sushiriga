import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui';
import { categoryName, findCategory, findProduct } from '@/features/menu/catalog';
import { useCatalog } from '@/features/menu/CatalogContext';
import { useTranslation, type MessageKey } from '@/i18n';
import { useServices } from '@/services';
import type { AssistantMood, CategoryId } from '@/types';
import { createId } from '@/utils/id';
import { AssistantCharacter } from './AssistantCharacter';
import { AssistantMessage } from './AssistantMessage';
import { AssistantRecommendation } from './AssistantRecommendation';
import styles from './assistant.module.css';

interface ChatEntry {
  id: string;
  role: 'assistant' | 'user';
  /** User text, or a translation key for assistant replies (re-rendered on language change). */
  text?: string;
  textKey?: MessageKey;
  categoryId?: CategoryId;
  recommendations: string[];
}

const SUGGESTIONS = ['salmon', 'chicken', 'warm', 'group', 'cheapest'] as const;

export function AIAssistant() {
  const { t, locale } = useTranslation();
  const { assistant } = useServices();
  const catalog = useCatalog();
  const [entries, setEntries] = useState<ChatEntry[]>([
    { id: 'greeting', role: 'assistant', textKey: 'assistant.greeting', recommendations: [] },
  ]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState<AssistantMood>('idle');
  const busy = mood === 'thinking';
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setEntries((current) => [
      ...current,
      { id: createId('msg'), role: 'user', text, recommendations: [] },
    ]);
    setInput('');
    setMood('thinking');
    try {
      const reply = await assistant.ask(text, { catalog, locale });
      // Defence in depth: only ids that exist in the catalog are ever shown.
      const recommendations = reply.recommendations.filter((id) => findProduct(catalog, id));
      setEntries((current) => [
        ...current,
        {
          id: createId('msg'),
          role: 'assistant',
          textKey: reply.textKey,
          ...(reply.categoryId ? { categoryId: reply.categoryId } : {}),
          recommendations,
        },
      ]);
      setMood('talking');
      setTimeout(() => setMood('idle'), 1200);
    } catch {
      setEntries((current) => [
        ...current,
        { id: createId('msg'), role: 'assistant', textKey: 'assistant.none', recommendations: [] },
      ]);
      setMood('idle');
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
    inputRef.current?.focus();
  }

  return (
    <div className={styles.assistant}>
      <div className={styles.characterColumn}>
        <AssistantCharacter mood={mood} size="9rem" label={t('assistant.characterLabel')} />
      </div>
      <div className={styles.chat}>
        {/* The live region wraps the list, so the messages keep their list semantics. */}
        <div role="log" aria-live="polite" aria-relevant="additions">
          <ol className={styles.log} role="list">
            {entries.map((entry) => {
              const category = entry.categoryId
                ? findCategory(catalog, entry.categoryId)
                : undefined;
              return (
                <AssistantMessage key={entry.id} role={entry.role}>
                  <p>
                    {entry.textKey
                      ? t(
                          entry.textKey,
                          category ? { category: categoryName(category, locale) } : undefined,
                        )
                      : entry.text}
                  </p>
                  {entry.recommendations.length > 0 && (
                    <ul className={styles.recommendations} role="list">
                      {entry.recommendations.map((id) => {
                        const product = findProduct(catalog, id);
                        return product ? (
                          <AssistantRecommendation key={id} product={product} />
                        ) : null;
                      })}
                    </ul>
                  )}
                </AssistantMessage>
              );
            })}
          </ol>
        </div>
        {busy && (
          <p className={styles.thinking} role="status">
            {t('assistant.thinking')}
          </p>
        )}
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((key) => (
            <Button
              key={key}
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void ask(t(`assistant.suggestions.${key}`))}
            >
              {t(`assistant.suggestions.${key}`)}
            </Button>
          ))}
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          <label htmlFor="assistant-input" className="visually-hidden">
            {t('assistant.inputLabel')}
          </label>
          <input
            id="assistant-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('assistant.placeholder')}
            autoComplete="off"
            enterKeyHint="send"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {t('assistant.send')}
          </Button>
        </form>
      </div>
    </div>
  );
}
