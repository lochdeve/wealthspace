import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export function TextInput({ className, hasError, ...props }: TextInputProps) {
  const describedBy = [
    props['aria-describedby'],
    hasError ? `${props.id}-error` : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      {...props}
      aria-invalid={hasError || undefined}
      aria-describedby={describedBy || undefined}
      className={[styles.input, className].filter(Boolean).join(' ')}
    />
  );
}
