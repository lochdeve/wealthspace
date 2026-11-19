'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { createBudget } from '@/lib/api/budgets';
import type { Category } from '@/lib/api/finance-types';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from '@/components/finance/finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type CreateBudgetFormProps = {
  spaceId: string;
  defaultCurrency?: string;
  expenseCategories: Category[];
};

function defaultPeriodBounds(): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    periodStart: `${year}-${month}-01`,
    periodEnd: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function CreateBudgetForm({
  spaceId,
  defaultCurrency = 'EUR',
  expenseCategories,
}: CreateBudgetFormProps) {
  const router = useRouter();
  const initialPeriod = useMemo(() => defaultPeriodBounds(), []);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [periodStart, setPeriodStart] = useState(initialPeriod.periodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.periodEnd);
  const [categoryId, setCategoryId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Introduce un nombre.';
    }
    if (!amount.trim()) {
      errors.amount = 'Indica el importe.';
    }
    if (!currency.trim()) {
      errors.currency = 'Indica la moneda.';
    }
    if (!periodStart) {
      errors.periodStart = 'Indica la fecha de inicio.';
    }
    if (!periodEnd) {
      errors.periodEnd = 'Indica la fecha de fin.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await createBudget(spaceId, {
        name: name.trim(),
        amount: amount.trim(),
        currency: currency.trim().toUpperCase(),
        periodStart,
        periodEnd,
        categoryId: categoryId || undefined,
      });
      setName('');
      setAmount('');
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.sectionTitle}>Nuevo presupuesto</h3>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="budget-name" label="Nombre" error={fieldErrors.name}>
        <TextInput
          id="budget-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="budget-amount" label="Importe" error={fieldErrors.amount}>
        <TextInput
          id="budget-amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          inputMode="decimal"
          required
        />
      </Field>
      <Field id="budget-currency" label="Moneda (ISO 4217)" error={fieldErrors.currency}>
        <TextInput
          id="budget-currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          hasError={Boolean(fieldErrors.currency)}
          disabled={pending}
          maxLength={3}
          required
        />
      </Field>
      <Field id="budget-period-start" label="Inicio del periodo" error={fieldErrors.periodStart}>
        <TextInput
          id="budget-period-start"
          type="date"
          value={periodStart}
          onChange={(event) => setPeriodStart(event.target.value)}
          hasError={Boolean(fieldErrors.periodStart)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="budget-period-end" label="Fin del periodo" error={fieldErrors.periodEnd}>
        <TextInput
          id="budget-period-end"
          type="date"
          value={periodEnd}
          onChange={(event) => setPeriodEnd(event.target.value)}
          hasError={Boolean(fieldErrors.periodEnd)}
          disabled={pending}
          required
        />
      </Field>
      {expenseCategories.length > 0 ? (
        <Field id="budget-category" label="Categoría (opcional)">
          <select
            id="budget-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={pending}
          >
            <option value="">Sin categoría</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Crear presupuesto'}
      </Button>
    </form>
  );
}
