'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { Category } from '@/lib/api/finance-types';
import { createExpense, createIncome } from '@/lib/api/transactions';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
import { CategorySelectField } from '@/components/finance/category-select-field';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type RecordCashflowFormProps = {
  spaceId: string;
  accountId: string;
  kind: 'INCOME' | 'EXPENSE';
  categories?: Category[];
};

export function RecordCashflowForm({
  spaceId,
  accountId,
  kind,
  categories = [],
}: RecordCashflowFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const title = kind === 'INCOME' ? 'Registrar ingreso' : 'Registrar gasto';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    const errors: Record<string, string> = {};
    if (!isPositiveAmount(normalized)) {
      errors.amount = 'Importe positivo con hasta 4 decimales.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      const payload = {
        accountId,
        amount: normalized,
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
      };
      if (kind === 'INCOME') {
        await createIncome(spaceId, payload);
      } else {
        await createExpense(spaceId, payload);
      }
      setAmount('');
      setDescription('');
      setCategoryId('');
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id={`${kind}-amount`} label="Importe" error={fieldErrors.amount}>
        <TextInput
          id={`${kind}-amount`}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          required
        />
      </Field>
      <Field id={`${kind}-description`} label="Concepto (opcional)">
        <TextInput
          id={`${kind}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      <CategorySelectField
        id={`${kind}-category`}
        spaceId={spaceId}
        categories={categories}
        categoryType={kind}
        value={categoryId}
        onChange={setCategoryId}
        disabled={pending}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  );
}
