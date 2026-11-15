'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { Account, Category } from '@/lib/api/finance-types';
import { createSharedExpense } from '@/lib/api/transactions';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { canPickAttributionFor } from '@/lib/finance/attribution';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
import type { MembershipRole } from '@/lib/api/space-types';
import { membershipRoleLabel } from '@/lib/spaces/labels';
import { CategorySelectField } from '@/components/finance/category-select-field';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type MemberOption = {
  userId: string;
  displayName: string;
  email: string;
  role: MembershipRole;
};

type RecordSharedExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  actorRole: MembershipRole;
  members: MemberOption[];
  accounts: Account[];
  categories: Category[];
  displayCurrency: string | null;
};

export function RecordSharedExpenseForm({
  spaceId,
  currentUserId,
  actorRole,
  members,
  accounts,
  categories,
  displayCurrency,
}: RecordSharedExpenseFormProps) {
  const router = useRouter();
  const attributionOptions = members.filter((member) =>
    canPickAttributionFor(actorRole, currentUserId, member.userId),
  );
  const defaultAttributed =
    attributionOptions.find((m) => m.userId === currentUserId)?.userId ??
    attributionOptions[0]?.userId ??
    '';

  const [attributedToUserId, setAttributedToUserId] = useState(defaultAttributed);
  const [accountId, setAccountId] = useState('');
  const [currency, setCurrency] = useState(displayCurrency ?? 'EUR');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const showCurrencyField = !accountId && !displayCurrency;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    const errors: Record<string, string> = {};
    if (!attributedToUserId) {
      errors.attributed = 'Selecciona la atribución.';
    }
    if (!isPositiveAmount(normalized)) {
      errors.amount = 'Importe positivo con hasta 4 decimales.';
    }
    if (showCurrencyField && !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
      errors.currency = 'Moneda ISO 4217 de 3 letras.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await createSharedExpense(spaceId, {
        amount: normalized,
        attributedToUserId,
        accountId: accountId || undefined,
        currency: showCurrencyField ? currency.trim().toUpperCase() : undefined,
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
      });
      router.push(`/spaces/${spaceId}`);
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="shared-attributed" label="Atribuido a" error={fieldErrors.attributed}>
        <select
          id="shared-attributed"
          className={styles.selectNative}
          value={attributedToUserId}
          onChange={(event) => setAttributedToUserId(event.target.value)}
          disabled={pending || attributionOptions.length <= 1}
        >
          {attributionOptions.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName} ({membershipRoleLabel(member.role)})
            </option>
          ))}
        </select>
      </Field>
      <Field id="shared-account" label="Cuenta (opcional)">
        <select
          id="shared-account"
          className={styles.selectNative}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          disabled={pending}
        >
          <option value="">Sin cuenta — no mueve saldo</option>
          {accounts
            .filter((row) => !row.archivedAt)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
        </select>
      </Field>
      {showCurrencyField ? (
        <Field id="shared-currency" label="Moneda" error={fieldErrors.currency}>
          <TextInput
            id="shared-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            hasError={Boolean(fieldErrors.currency)}
            disabled={pending}
            maxLength={3}
          />
        </Field>
      ) : null}
      <Field id="shared-amount" label="Importe" error={fieldErrors.amount}>
        <TextInput
          id="shared-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          required
        />
      </Field>
      <CategorySelectField
        id="shared-category"
        spaceId={spaceId}
        categories={categories}
        categoryType="EXPENSE"
        value={categoryId}
        onChange={setCategoryId}
        disabled={pending}
      />
      <Field id="shared-description" label="Concepto (opcional)">
        <TextInput
          id="shared-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Registrar gasto'}
      </Button>
    </form>
  );
}
