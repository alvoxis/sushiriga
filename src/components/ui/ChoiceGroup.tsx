import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import styles from './Form.module.css';

export interface Choice<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  legendHidden?: boolean;
  name?: string;
  choices: Choice<T>[];
  /** `null` = nothing selected (e.g. a rating that must be chosen explicitly). */
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}

/** Radio group rendered as pill "chips". Native radios → arrow-key navigation for free. */
export function ChoiceGroup<T extends string>({
  legend,
  legendHidden,
  name,
  choices,
  value,
  onChange,
  className,
}: ChoiceGroupProps<T>) {
  const generated = useId();
  const groupName = name ?? generated;
  return (
    <fieldset className={cn(styles.choices, className)}>
      <legend className={legendHidden ? 'visually-hidden' : styles.label}>{legend}</legend>
      {choices.map((choice) => (
        <label key={choice.value} className={styles.choice}>
          <input
            type="radio"
            name={groupName}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            aria-label={choice.ariaLabel}
          />
          <span>{choice.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
