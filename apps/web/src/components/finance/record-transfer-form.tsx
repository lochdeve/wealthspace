'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { Account } from '@/lib/api/finance-types';
import { createTransfer } from '@/lib/api/transactions';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type RecordTransferFormProps = {
  spaceId: string;
  sourceAccount: Account;
  destinationAccounts: Account[];
};

export function RecordTransferForm({
  spaceId,
  sourceAccount,
  destinationAccounts,
}: RecordTransferFormProps) {
  const router = useRouter();
  const [destinationId, setDestinationId] = useState(destinationAccounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (destinationAccounts.length === 0) {
    return (
      <p className={styles.meta}>
        Necesitas otra cuenta en {sourceAccount.currency} para transferir.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    const errors: Record<string, string> = {};
    if (!destinationId) {
      errors.destination = 'Selecciona cuenta de destino.';
    }
    if (!isPositiveAmount(normalized)) {
      errors.amount = 'Importe positivo con hasta 4 decimales.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await createTransfer(spaceId, {
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationId,
        amount: normalized,
        description: description.trim() || undefined,
      });
      setAmount('');
      setDescription('');
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.sectionTitle}>Transferir</h3>
      <p className={styles.meta}>
        Desde «{sourceAccount.name}» ({sourceAccount.currency}).
      </p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="transfer-destination" label="Cuenta destino" error={fieldErrors.destination}>
        <select
          id="transfer-destination"
          className={styles.selectNative}
          value={destinationId}
          onChange={(event) => setDestinationId(event.target.value)}
          disabled={pending}
        >
          {destinationAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="transfer-amount" label="Importe" error={fieldErrors.amount}>
        <TextInput
          id="transfer-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="transfer-description" label="Concepto (opcional)">
        <TextInput
          id="transfer-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Transfiriendo…' : 'Transferir'}
      </Button>
    </form>
  );
}
