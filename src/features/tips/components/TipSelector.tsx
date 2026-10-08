import { useState } from 'react';
import { ChoiceGroup, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { TIP_PRESETS, type TipSelection } from '@/types';
import { parseCustomTip } from '../tips';
import styles from './tips.module.css';

type ChoiceValue = 'none' | 'custom' | `preset-${number}`;

/**
 * "Give a smile" — an optional tip. "No tip" is the default and is listed first; there are
 * no pre-selected amounts, guilt messages or nagging.
 */
export function TipSelector({
  value,
  onChange,
}: {
  value: TipSelection;
  onChange: (value: TipSelection) => void;
}) {
  const { t, formatPrice } = useTranslation();
  const [custom, setCustom] = useState(value.kind === 'custom' ? String(value.amount / 100) : '');
  const [error, setError] = useState<string | null>(null);

  const selected: ChoiceValue =
    value.kind === 'none' ? 'none' : value.kind === 'custom' ? 'custom' : `preset-${value.amount}`;

  function select(choice: ChoiceValue) {
    setError(null);
    if (choice === 'none') onChange({ kind: 'none' });
    else if (choice === 'custom') onChange({ kind: 'custom', amount: parseCustomTip(custom) ?? 0 });
    else onChange({ kind: 'preset', amount: Number(choice.slice('preset-'.length)) });
  }

  return (
    <section className={styles.tips} aria-labelledby="tips-title">
      <h2 id="tips-title" className={styles.title}>
        {t('tips.title')} <span aria-hidden="true">☺</span>
      </h2>
      <p className={styles.lead}>{t('tips.lead')}</p>
      <ChoiceGroup<ChoiceValue>
        legend={t('tips.title')}
        legendHidden
        value={selected}
        onChange={select}
        choices={[
          { value: 'none', label: t('tips.none') },
          ...TIP_PRESETS.map((amount) => ({
            value: `preset-${amount}` as ChoiceValue,
            label: formatPrice(amount),
          })),
          { value: 'custom', label: t('tips.custom') },
        ]}
      />
      {value.kind === 'custom' && (
        <TextField
          label={t('tips.customLabel')}
          inputMode="decimal"
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            const amount = parseCustomTip(event.target.value);
            setError(amount || !event.target.value ? null : t('tips.invalid'));
            onChange({ kind: 'custom', amount: amount ?? 0 });
          }}
          {...(error ? { error } : {})}
        />
      )}
      {value.kind !== 'none' && (value.kind === 'preset' || value.amount > 0) && (
        <p className={styles.thanks} role="status">
          {t('tips.thanks')}
        </p>
      )}
    </section>
  );
}
