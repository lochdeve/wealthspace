'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { Account, Category } from '@/lib/api/finance-types';
import { ApiError } from '@/lib/api/errors';
import { createAttributedExpense } from '@/lib/api/transactions';
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

type RecordIndividualExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  actorRole: MembershipRole;
  members: MemberOption[];
  accounts: Account[];
  categories: Category[];
  displayCurrency: string | null;
  defaultAccountId?: string;
};

type FieldName = 'attributed' | 'account' | 'amount' | 'currency';

const FIELD_BY_ERROR_CODE: Record<string, FieldName> = {
  ATTRIBUTION_REQUIRED: 'attributed',
  ATTRIBUTION_NOT_ALLOWED: 'attributed',
  ATTRIBUTEE_NOT_ACTIVE_MEMBER: 'attributed',
  ACCOUNT_NOT_FOUND: 'account',
  ACCOUNT_ARCHIVED: 'account',
  INVALID_AMOUNT: 'amount',
  CURRENCY_REQUIRED: 'currency',
};

export function RecordIndividualExpenseForm({
  spaceId,
  currentUserId,
  actorRole,
  members,
  accounts,
  categories,
  displayCurrency,
  defaultAccountId,
}: RecordIndividualExpenseFormProps) {
  const router = useRouter();
  const attributionOptions = members.filter((member) =>
    canPickAttributionFor(actorRole, currentUserId, member.userId),
  );
  const defaultAttributed =
    attributionOptions.find((m) => m.userId === currentUserId)?.userId ??
    attributionOptions[0]?.userId ??
    '';
  const activeAccounts = accounts.filter((row) => !row.archivedAt);
  const initialAccountId = activeAccounts.some((row) => row.id === defaultAccountId)
    ? (defaultAccountId ?? '')
    : '';

  const [attributedToUserId, setAttributedToUserId] = useState(defaultAttributed);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [currency, setCurrency] = useState(displayCurrency ?? 'EUR');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const showCurrencyField = !accountId && !displayCurrency;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    const errors: Partial<Record<FieldName, string>> = {};
    if (!attributedToUserId) {
      errors.attributed = 'Indica de quién es el gasto.';
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
      await createAttributedExpense(spaceId, {
        amount: normalized,
        attributedToUserId,
        accountId: accountId || undefined,
        currency: showCurrencyField ? currency.trim().toUpperCase() : undefined,
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
      });
      router.push(`/spaces/${spaceId}/transactions`);
      router.refresh();
    } catch (error) {
      const message = financeActionErrorMessage(error);
      const field =
        error instanceof ApiError && error.code ? FIELD_BY_ERROR_CODE[error.code] : undefined;
      if (field) {
        setFieldErrors({ [field]: message });
      } else {
        setFormError(message);
      }
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
      <Field
        id="individual-attributed"
        label="Atribuido a"
        hint="El gasto cuenta solo para esta persona."
        error={fieldErrors.attributed}
      >
        <select
          id="individual-attributed"
          className={styles.selectNative}
          value={attributedToUserId}
          onChange={(event) => setAttributedToUserId(event.target.value)}
          disabled={pending || attributionOptions.length <= 1}
          aria-invalid={Boolean(fieldErrors.attributed) || undefined}
          aria-describedby={
            fieldErrors.attributed ? 'individual-attributed-error' : 'individual-attributed-hint'
          }
        >
          {attributionOptions.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName} ({membershipRoleLabel(member.role)})
            </option>
          ))}
        </select>
      </Field>
      <Field id="individual-account" label="Cuenta (opcional)" error={fieldErrors.account}>
        <select
          id="individual-account"
          className={styles.selectNative}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          disabled={pending}
          aria-invalid={Boolean(fieldErrors.account) || undefined}
          aria-describedby={fieldErrors.account ? 'individual-account-error' : undefined}
        >
          <option value="">Sin cuenta — no mueve saldo</option>
          {activeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </Field>
      {showCurrencyField ? (
        <Field id="individual-currency" label="Moneda" error={fieldErrors.currency}>
          <TextInput
            id="individual-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            hasError={Boolean(fieldErrors.currency)}
            disabled={pending}
            maxLength={3}
          />
        </Field>
      ) : null}
      <Field id="individual-amount" label="Importe" error={fieldErrors.amount}>
        <TextInput
          id="individual-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hasError={Boolean(fieldErrors.amount)}
          disabled={pending}
          required
        />
      </Field>
      <CategorySelectField
        id="individual-category"
        spaceId={spaceId}
        categories={categories}
        categoryType="EXPENSE"
        value={categoryId}
        onChange={setCategoryId}
        disabled={pending}
      />
      <Field id="individual-description" label="Concepto (opcional)">
        <TextInput
          id="individual-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Registrar gasto individual'}
      </Button>
    </form>
  );
}
