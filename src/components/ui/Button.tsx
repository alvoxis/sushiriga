import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/utils/cn';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconOnly?: boolean;
}

function buttonClass(
  { variant = 'primary', size = 'md', block, iconOnly }: StyleProps,
  extra?: string,
) {
  return cn(
    styles.button,
    variant !== 'primary' && styles[variant],
    size !== 'md' && styles[size],
    block && styles.block,
    iconOnly && styles.icon,
    extra,
  );
}

export function Button({
  variant,
  size,
  block,
  iconOnly,
  className,
  type = 'button',
  ...props
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, iconOnly }, className)}
      {...props}
    />
  );
}

/** A router link styled as a button. */
export function ButtonLink({
  variant,
  size,
  block,
  iconOnly,
  className,
  ...props
}: StyleProps & LinkProps) {
  return <Link className={buttonClass({ variant, size, block, iconOnly }, className)} {...props} />;
}
