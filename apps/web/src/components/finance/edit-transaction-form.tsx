'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { FinancialTransaction } from '@/lib/api/finance-types';
import { updateTransaction } from '@/lib/api/transactions';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { isPositiveAmount, isSignedAmount, normalizeAmountInput } from '@/lib/finance/amount';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type EditTransactionFormProps = {
  spaceId: string;
  transaction: FinancialTransaction;
};

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditTransactionForm({ spaceId, transaction }: EditTransactionFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(transaction.amount);
  const [description, setDescription] = useState(transaction.description ?? '');
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue(transaction.occurredAt));
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const allowSigned = transaction.type === 'OPENING_BALANCE';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    const errors: Record<string, string> = {};
    const validAmount = allowSigned ? isSignedAmount(normalized) : isPositiveAmount(normalized);
    if (!validAmount) {
      errors.amount = allowSigned
        ? 'Importe con hasta 4 decimales (puede ser negativo).'
        : 'Importe positivo con hasta 4 decimales.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await updateTransaction(spaceId, transaction.id, {
        expectedVersion: transaction.version,
        amount: normalized,
        description: description.trim() || null,
        occurredAt: new Date(occurredAt).toISOString(),
        reason: reason.trim() || undefined,
      });
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.sectionTitle}>Editar movimiento</h2>
      <p className={styles.meta}>Versión actual: {transaction.version}</p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="tx-amount" label="Importe" error={fieldErrors.amount}>
        <TextInput
          id="tx-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="tx-description" label="Concepto">
        <TextInput
          id="tx-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Field id="tx-occurred" label="Fecha y hora">
        <TextInput
          id="tx-occurred"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="tx-reason" label="Motivo del cambio (opcional)">
        <TextInput
          id="tx-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
