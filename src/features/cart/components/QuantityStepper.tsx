import { Icon } from '@/components/ui';
import { MAX_QUANTITY } from '../cartMath';
import styles from './cart.module.css';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  valueLabel: string;
  min?: number;
}

export function QuantityStepper({
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
  valueLabel,
  min = 0,
}: QuantityStepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={valueLabel}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={decreaseLabel}
      >
        <Icon name="minus" size={18} />
      </button>
      <output className={styles.qty} aria-live="polite" data-testid="quantity">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label={increaseLabel}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
