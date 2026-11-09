import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import styles from './ui.module.css';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
  }
>;

export function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = variant === 'secondary' ? styles.buttonSecondary : styles.button;
  return (
    <button type={type} className={[variantClass, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </button>
  );
}
