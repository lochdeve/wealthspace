'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import type { Account } from '@/lib/api/finance-types';
import { createContribution } from '@/lib/api/contributions';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
import { contributionActionErrorMessage } from '@/lib/finance/contribution-messages';
import {
  resolvePersonalAccountSelection,
  writeLastPersonalAccountId,
} from '@/lib/finance/last-personal-account';
import { activeAccountsMatchingCurrency } from '@/lib/finance/personal-cash-link';
import { spaceTransactionsHref } from '@/lib/finance/routes';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type CreateContributionFormProps = {
  spaceId: string;
  sharedAccount: Account;
  currentUserId: string;
  personalAccounts: Account[];
};

export function CreateContributionForm({
  spaceId,
  sharedAccount,
  currentUserId,
  personalAccounts,
}: CreateContributionFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [debitPersonal, setDebitPersonal] = useState(false);
  const [personalAccountId, setPersonalAccountId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const personalOptions = useMemo(
    () => activeAccountsMatchingCurrency(personalAccounts, sharedAccount.currency),
    [personalAccounts, sharedAccount.currency],
  );

  const effectivePersonalAccountId = useMemo(() => {
    if (!debitPersonal) {
      return '';
    }
    return resolvePersonalAccountSelection(currentUserId, personalOptions, personalAccountId);
  }, [debitPersonal, currentUserId, personalOptions, personalAccountId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    if (!isPositiveAmount(normalized)) {
      setFormError('Importe positivo con hasta 4 decimales.');
      return;
    }
    if (debitPersonal && !effectivePersonalAccountId) {
      setFormError('Selecciona una cuenta personal o desmarca la salida vinculada.');
      return;
    }

    setPending(true);
    try {
      await createContribution(spaceId, {
        sharedAccountId: sharedAccount.id,
        amount: normalized,
        currency: sharedAccount.currency,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        note: note.trim() || undefined,
        ...(debitPersonal && effectivePersonalAccountId
          ? { personalAccountId: effectivePersonalAccountId }
          : {}),
      });
      if (debitPersonal && effectivePersonalAccountId) {
        writeLastPersonalAccountId(currentUserId, effectivePersonalAccountId);
      }
      router.push(spaceTransactionsHref(spaceId, { accountId: sharedAccount.id }));
      router.refresh();
    } catch (error) {
      setFormError(contributionActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.meta}>
        Ingreso en la cuenta común «{sharedAccount.name}» ({sharedAccount.currency}). No genera
        deudas entre miembros.
      </p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="contribution-amount" label="Importe">
        <TextInput
          id="contribution-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="contribution-note" label="Nota (opcional)">
        <TextInput
          id="contribution-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={pending}
        />
      </Field>
      <Field id="contribution-occurred" label="Fecha (opcional)">
        <TextInput
          id="contribution-occurred"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          disabled={pending}
        />
      </Field>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Tu espacio personal (opcional)</legend>
        <label className={styles.checkRow} htmlFor="contribution-debit-personal">
          <input
            id="contribution-debit-personal"
            type="checkbox"
            checked={debitPersonal}
            onChange={(event) => setDebitPersonal(event.target.checked)}
            disabled={pending}
          />
          <span>Registrar también la salida en mi cuenta personal (P-06)</span>
        </label>
        {debitPersonal ? (
          personalOptions.length === 0 ? (
            <p className={styles.meta} role="status">
              No tienes cuentas personales activas en {sharedAccount.currency}.
            </p>
          ) : (
            <Field id="contribution-personal-account" label="Cuenta personal">
              <select
                id="contribution-personal-account"
                className={styles.selectNative}
                value={effectivePersonalAccountId}
                onChange={(event) => setPersonalAccountId(event.target.value)}
                disabled={pending}
                required
              >
                {personalOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} ({row.currency})
                  </option>
                ))}
              </select>
            </Field>
          )
        ) : null}
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? 'Registrando…' : 'Registrar aportación'}
      </Button>
    </form>
  );
}
