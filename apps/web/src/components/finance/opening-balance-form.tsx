'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createOpeningBalance } from '@/lib/api/transactions';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { isSignedAmount, normalizeAmountInput } from '@/lib/finance/amount';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type OpeningBalanceFormProps = {
  spaceId: string;
  accountId: string;
  currency: string;
};

export function OpeningBalanceForm({ spaceId, accountId, currency }: OpeningBalanceFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    const errors: Record<string, string> = {};
    if (!isSignedAmount(normalized)) {
      errors.amount = 'Importe con hasta 4 decimales (puede ser negativo).';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await createOpeningBalance(spaceId, accountId, {
        amount: normalized,
        description: description.trim() || undefined,
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
      <h3 className={styles.sectionTitle}>Saldo inicial</h3>
      <p className={styles.meta}>Una sola vez por cuenta. Moneda: {currency}.</p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="ob-amount" label="Importe" error={fieldErrors.amount}>
        <TextInput
          id="ob-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="ob-description" label="Nota (opcional)">
        <TextInput
          id="ob-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Registrar saldo inicial'}
      </Button>
    </form>
  );
}
