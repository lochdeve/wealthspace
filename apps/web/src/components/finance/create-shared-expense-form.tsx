'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Account, Category } from '@/lib/api/finance-types';
import type {
  CreateSharedExpenseInput,
  GeneratedDebt,
  PaymentSource,
  SharedExpenseParticipant,
  SplitMode,
  SplitInput,
} from '@/lib/api/shared-expense-types';
import { ApiError } from '@/lib/api/errors';
import { createSharedExpense, previewSharedExpense } from '@/lib/api/shared-expenses';
import { canPickAttributionFor } from '@/lib/finance/attribution';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
import { percentsForUserIds } from '@/lib/finance/equal-percent-shares';
import { fixedAmountSplitHint, percentSplitHint } from '@/lib/finance/split-input-hints';
import { sharedExpenseActionErrorMessage } from '@/lib/finance/shared-expense-messages';
import { sharedExpenseParticipantError } from '@/lib/finance/shared-expense-participants';
import { sharedExpenseDetailHref } from '@/lib/finance/routes';
import { SharedExpensePreviewPanel } from '@/components/finance/shared-expense-preview-panel';
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

type CreateSharedExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  actorRole: MembershipRole;
  members: MemberOption[];
  accounts: Account[];
  categories: Category[];
  displayCurrency: string | null;
};

type FieldName = 'amount' | 'currency' | 'payer' | 'account' | 'participants' | 'occurredAt';

const ERROR_FIELD: Partial<Record<string, FieldName>> = {
  PAYER_NOT_ALLOWED: 'payer',
  PAYER_NOT_MEMBER: 'payer',
  PARTICIPANT_NOT_MEMBER: 'participants',
  INSUFFICIENT_PARTICIPANTS: 'participants',
  DUPLICATE_PARTICIPANT: 'participants',
  SPLIT_SHARE_ZERO: 'participants',
  SPLIT_PERCENT_SUM_INVALID: 'participants',
  SPLIT_AMOUNT_SUM_INVALID: 'participants',
  ACCOUNT_NOT_FOUND: 'account',
  ACCOUNT_ARCHIVED: 'account',
  AMOUNT_PRECISION_INVALID: 'amount',
  CURRENCY_REQUIRED: 'currency',
  CURRENCY_NOT_SUPPORTED: 'currency',
};

function defaultParticipantIds(members: MemberOption[]): string[] {
  return members.map((member) => member.userId);
}

export function CreateSharedExpenseForm({
  spaceId,
  currentUserId,
  actorRole,
  members,
  accounts,
  categories,
  displayCurrency,
}: CreateSharedExpenseFormProps) {
  const router = useRouter();
  const payerOptions = members.filter((member) =>
    canPickAttributionFor(actorRole, currentUserId, member.userId),
  );
  const defaultPaidBy =
    payerOptions.find((member) => member.userId === currentUserId)?.userId ??
    payerOptions[0]?.userId ??
    '';
  const activeAccounts = useMemo(() => accounts.filter((row) => !row.archivedAt), [accounts]);

  const [paymentSource, setPaymentSource] = useState<PaymentSource>('MEMBER');
  const [paidByUserId, setPaidByUserId] = useState(defaultPaidBy);
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>(() =>
    defaultParticipantIds(members),
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [currency, setCurrency] = useState(displayCurrency ?? 'EUR');
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUAL');
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>(() =>
    percentsForUserIds(defaultParticipantIds(members)),
  );
  const [fixedShares, setFixedShares] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewParticipants, setPreviewParticipants] = useState<SharedExpenseParticipant[] | null>(
    null,
  );
  const [previewDebts, setPreviewDebts] = useState<GeneratedDebt[] | null>(null);
  const previewRequestRef = useRef(0);

  const showCurrencyField = paymentSource === 'MEMBER' && !displayCurrency && !accountId;

  const canPreview = useMemo(() => {
    const normalized = normalizeAmountInput(amount);
    const participantError = sharedExpenseParticipantError(
      paymentSource,
      paidByUserId,
      participantIds,
      members.length,
    );
    return isPositiveAmount(normalized) && participantIds.length > 0 && !participantError;
  }, [amount, paymentSource, paidByUserId, participantIds, members.length]);

  const percentHint = useMemo(() => {
    if (splitMode !== 'PERCENTAGE' || participantIds.length === 0) {
      return null;
    }
    return percentSplitHint(participantIds.map((id) => percentageShares[id] ?? ''));
  }, [splitMode, participantIds, percentageShares]);

  const fixedHint = useMemo(() => {
    if (splitMode !== 'FIXED_AMOUNT' || participantIds.length === 0) {
      return null;
    }
    return fixedAmountSplitHint(amount, participantIds.map((id) => fixedShares[id] ?? ''));
  }, [splitMode, participantIds, fixedShares, amount]);

  function syncPercentageShares(nextParticipantIds: string[], previous?: Record<string, string>) {
    const base = percentsForUserIds(nextParticipantIds);
    const prior = previous ?? percentageShares;
    for (const userId of nextParticipantIds) {
      if (prior[userId]?.trim()) {
        base[userId] = prior[userId]!;
      }
    }
    setPercentageShares(base);
  }

  function syncFixedShares(nextParticipantIds: string[]) {
    setFixedShares((current) => {
      const next: Record<string, string> = {};
      for (const userId of nextParticipantIds) {
        if (current[userId]) {
          next[userId] = current[userId];
        }
      }
      return next;
    });
  }

  function setParticipantSelection(nextIds: string[]) {
    setParticipantIds(nextIds);
    syncPercentageShares(nextIds);
    syncFixedShares(nextIds);
  }

  function clearParticipantFieldError() {
    setFieldErrors((current) => {
      if (!current.participants) {
        return current;
      }
      const next = { ...current };
      delete next.participants;
      return next;
    });
  }

  function toggleParticipant(userId: string) {
    clearParticipantFieldError();
    setParticipantIds((current) => {
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      syncPercentageShares(next, percentageShares);
      syncFixedShares(next);
      return next;
    });
  }

  function handleSplitModeChange(nextMode: SplitMode) {
    clearParticipantFieldError();
    setSplitMode(nextMode);
    setPreviewError(null);
    if (nextMode === 'PERCENTAGE') {
      setPercentageShares(percentsForUserIds(participantIds));
    }
    if (nextMode === 'FIXED_AMOUNT') {
      setFixedShares({});
    }
  }

  function buildSplit(): SplitInput {
    if (splitMode === 'EQUAL') {
      return { mode: 'EQUAL', participantUserIds: participantIds };
    }
    if (splitMode === 'PERCENTAGE') {
      return {
        mode: 'PERCENTAGE',
        shares: participantIds.map((userId) => ({
          userId,
          percent: (percentageShares[userId] ?? '').trim(),
        })),
      };
    }
    return {
      mode: 'FIXED_AMOUNT',
      shares: participantIds.map((userId) => ({
        userId,
        amount: normalizeAmountInput(fixedShares[userId] ?? ''),
      })),
    };
  }

  function buildPayload(normalizedAmount: string): CreateSharedExpenseInput {
    const payment =
      paymentSource === 'MEMBER'
        ? { source: 'MEMBER' as const, paidByUserId }
        : { source: 'SPACE_ACCOUNT' as const, accountId };
    const payload: CreateSharedExpenseInput = {
      totalAmount: normalizedAmount,
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      payment,
      split: buildSplit(),
    };
    if (showCurrencyField) {
      payload.currency = currency.trim().toUpperCase();
    }
    return payload;
  }

  useEffect(() => {
    if (!canPreview) {
      return;
    }

    const normalized = normalizeAmountInput(amount);
    const payload = buildPayload(normalized);
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;

    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);
      previewSharedExpense(spaceId, payload)
        .then((result) => {
          if (previewRequestRef.current !== requestId) {
            return;
          }
          setPreviewParticipants(result.participants);
          setPreviewDebts(result.generatedDebts);
          setPreviewLoading(false);
        })
        .catch((error) => {
          if (previewRequestRef.current !== requestId) {
            return;
          }
          setPreviewParticipants(null);
          setPreviewDebts(null);
          setPreviewError(sharedExpenseActionErrorMessage(error));
          setPreviewLoading(false);
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPayload reads latest form state
  }, [
    canPreview,
    spaceId,
    amount,
    description,
    categoryId,
    occurredAt,
    currency,
    paymentSource,
    paidByUserId,
    accountId,
    participantIds,
    splitMode,
    percentageShares,
    fixedShares,
    showCurrencyField,
  ]);

  function validate(): boolean {
    const normalized = normalizeAmountInput(amount);
    const errors: Partial<Record<FieldName, string>> = {};
    if (!isPositiveAmount(normalized)) {
      errors.amount = 'Importe positivo con hasta 4 decimales.';
    }
    if (paymentSource === 'MEMBER' && !paidByUserId) {
      errors.payer = 'Indica quién pagó.';
    }
    if (paymentSource === 'SPACE_ACCOUNT' && !accountId) {
      errors.account = 'Selecciona la cuenta del espacio.';
    }
    const participantError = sharedExpenseParticipantError(
      paymentSource,
      paidByUserId,
      participantIds,
      members.length,
    );
    if (participantError) {
      errors.participants = participantError;
    }
    if (showCurrencyField && !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
      errors.currency = 'Moneda ISO 4217 de 3 letras.';
    }
    if (occurredAt) {
      const date = new Date(occurredAt);
      if (Number.isNaN(date.getTime())) {
        errors.occurredAt = 'Fecha u hora no válida.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    if (!validate()) {
      return;
    }

    const normalized = normalizeAmountInput(amount);
    setPending(true);
    try {
      const created = await createSharedExpense(spaceId, buildPayload(normalized));
      router.push(sharedExpenseDetailHref(spaceId, created.id));
      router.refresh();
    } catch (error) {
      const message = sharedExpenseActionErrorMessage(error);
      const field = error instanceof ApiError && error.code ? ERROR_FIELD[error.code] : undefined;
      if (field) {
        setFieldErrors({ [field]: message });
      } else {
        setFormError(message);
      }
    } finally {
      setPending(false);
    }
  }

  const allSelected = participantIds.length === members.length;
  const needsAnotherMember = members.length < 2;
  const submitDisabled = pending || needsAnotherMember;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {needsAnotherMember ? (
        <p className={ui.alert} role="status">
          Solo hay una persona en este espacio. Para repartir entre varios usa{' '}
          <strong>Gasto individual</strong> o invita a otra persona.
        </p>
      ) : null}
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="shared-description" label="Concepto">
        <TextInput
          id="shared-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
          autoFocus
        />
      </Field>
      <Field id="shared-amount" label="Importe total" error={fieldErrors.amount}>
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
      <Field id="shared-occurred" label="Fecha y hora (opcional)" error={fieldErrors.occurredAt}>
        <TextInput
          id="shared-occurred"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          hasError={Boolean(fieldErrors.occurredAt)}
          disabled={pending}
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
      <Field id="shared-payment-source" label="Quién pagó">
        <select
          id="shared-payment-source"
          className={styles.selectNative}
          value={paymentSource}
          onChange={(event) => setPaymentSource(event.target.value as PaymentSource)}
          disabled={pending}
        >
          <option value="MEMBER">Un miembro del espacio</option>
          <option value="SPACE_ACCOUNT">Cuenta del espacio</option>
        </select>
      </Field>
      {paymentSource === 'MEMBER' ? (
        <Field id="shared-payer" label="Pagador" error={fieldErrors.payer}>
          <select
            id="shared-payer"
            className={styles.selectNative}
            value={paidByUserId}
          onChange={(event) => {
            clearParticipantFieldError();
            setPaidByUserId(event.target.value);
          }}
          disabled={pending || payerOptions.length <= 1}
            aria-invalid={Boolean(fieldErrors.payer) || undefined}
          >
            {payerOptions.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName} ({membershipRoleLabel(member.role)})
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field id="shared-account" label="Cuenta del espacio" error={fieldErrors.account}>
          <select
            id="shared-account"
            className={styles.selectNative}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            disabled={pending || activeAccounts.length === 0}
            aria-invalid={Boolean(fieldErrors.account) || undefined}
          >
            {activeAccounts.length === 0 ? (
              <option value="">No hay cuentas activas</option>
            ) : (
              activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))
            )}
          </select>
        </Field>
      )}
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
      <Field id="shared-split-mode" label="Método de reparto">
        <select
          id="shared-split-mode"
          className={styles.selectNative}
          value={splitMode}
          onChange={(event) => handleSplitModeChange(event.target.value as SplitMode)}
          disabled={pending}
        >
          <option value="EQUAL">A partes iguales</option>
          <option value="PERCENTAGE">Por porcentajes</option>
          <option value="FIXED_AMOUNT">Por importes</option>
        </select>
      </Field>
      <fieldset className={styles.fieldset} aria-describedby="shared-participants-hint">
        <legend className={styles.legend}>Participantes</legend>
        <p id="shared-participants-hint" className={styles.meta}>
          {splitMode === 'EQUAL'
            ? 'Por defecto, todos reparten a partes iguales. Desmarca a quien no consumió.'
            : 'Solo los marcados entran en el reparto. El pagador puede no estar en la lista.'}
        </p>
        {fieldErrors.participants ? (
          <p className={ui.alert} id="shared-participants-error" role="alert">
            {fieldErrors.participants}
          </p>
        ) : null}
        <ul className={styles.list}>
          {members.map((member) => {
            const checked = participantIds.includes(member.userId);
            const inputId = `participant-${member.userId}`;
            return (
              <li key={member.userId}>
                <label className={styles.checkRow} htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(member.userId)}
                    disabled={pending}
                  />
                  <span>
                    {member.displayName} ({membershipRoleLabel(member.role)})
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className={styles.inlineActions}>
          <Button
            type="button"
            variant="secondary"
            disabled={pending || allSelected}
            onClick={() => setParticipantSelection(defaultParticipantIds(members))}
          >
            Seleccionar todos
          </Button>
        </div>
      </fieldset>
      {splitMode === 'PERCENTAGE' && participantIds.length > 0 ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Porcentajes</legend>
          {percentHint ? <p className={styles.meta}>{percentHint}</p> : null}
          <ul className={styles.list}>
            {participantIds.map((userId) => {
              const member = members.find((row) => row.userId === userId);
              const inputId = `percent-${userId}`;
              return (
                <li key={userId}>
                  <Field id={inputId} label={member?.displayName ?? userId}>
                    <TextInput
                      id={inputId}
                      inputMode="decimal"
                      value={percentageShares[userId] ?? ''}
                      onChange={(event) => {
                        clearParticipantFieldError();
                        setPercentageShares((current) => ({
                          ...current,
                          [userId]: event.target.value,
                        }));
                      }}
                      disabled={pending}
                    />
                  </Field>
                </li>
              );
            })}
          </ul>
          <div className={styles.inlineActions}>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setPercentageShares(percentsForUserIds(participantIds))}
            >
              Proponer reparto equitativo
            </Button>
          </div>
        </fieldset>
      ) : null}
      {splitMode === 'FIXED_AMOUNT' && participantIds.length > 0 ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Importe por participante</legend>
          {fixedHint ? <p className={styles.meta}>{fixedHint}</p> : null}
          <ul className={styles.list}>
            {participantIds.map((userId) => {
              const member = members.find((row) => row.userId === userId);
              const inputId = `fixed-${userId}`;
              return (
                <li key={userId}>
                  <Field id={inputId} label={member?.displayName ?? userId}>
                    <TextInput
                      id={inputId}
                      inputMode="decimal"
                      value={fixedShares[userId] ?? ''}
                      onChange={(event) => {
                        clearParticipantFieldError();
                        setFixedShares((current) => ({
                          ...current,
                          [userId]: event.target.value,
                        }));
                      }}
                      disabled={pending}
                    />
                  </Field>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
      <SharedExpensePreviewPanel
        active={canPreview}
        loading={previewLoading}
        error={previewError}
        participants={previewParticipants}
        generatedDebts={previewDebts}
        members={members}
      />
      <p className={styles.meta}>
        Al guardar, el reparto y las deudas quedan fijados; no hay confirmación de los demás.
      </p>
      <Button type="submit" disabled={submitDisabled}>
        {pending ? 'Guardando…' : 'Registrar gasto compartido'}
      </Button>
    </form>
  );
}
