'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import type { Account } from '@/lib/api/finance-types';
import type { MembershipRole, SpaceMember } from '@/lib/api/space-types';
import { createSettlement } from '@/lib/api/settlements';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
import {
  resolvePersonalAccountSelection,
  writeLastPersonalAccountId,
} from '@/lib/finance/last-personal-account';
import {
  activeAccountsMatchingCurrency,
  canRegisterSettlementPersonalCashFlow,
  settlementActorSide,
  settlementPersonalCashFlowHint,
} from '@/lib/finance/personal-cash-link';
import { settlementActionErrorMessage } from '@/lib/finance/settlement-messages';
import { canRegisterSettlement } from '@/lib/finance/settlement-permissions';
import { settlementsHref } from '@/lib/finance/routes';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type RegisterSettlementFormProps = {
  spaceId: string;
  currentUserId: string;
  actorRole: MembershipRole;
  members: SpaceMember[];
  personalAccounts: Account[];
  defaultFromUserId?: string;
  defaultToUserId?: string;
  defaultAmount?: string;
  defaultCurrency?: string;
};

export function RegisterSettlementForm({
  spaceId,
  currentUserId,
  actorRole,
  members,
  personalAccounts,
  defaultFromUserId = '',
  defaultToUserId = '',
  defaultAmount = '',
  defaultCurrency = 'EUR',
}: RegisterSettlementFormProps) {
  const router = useRouter();
  const [fromUserId, setFromUserId] = useState(defaultFromUserId);
  const [toUserId, setToUserId] = useState(defaultToUserId);
  const [amount, setAmount] = useState(defaultAmount);
  const [currency, setCurrency] = useState(defaultCurrency.toUpperCase());
  const [occurredAt, setOccurredAt] = useState('');
  const [annotatePersonalCash, setAnnotatePersonalCash] = useState(false);
  const [personalAccountId, setPersonalAccountId] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const actorSide = settlementActorSide(fromUserId, toUserId, currentUserId);
  const showPersonalCashFlow =
    actorSide !== null &&
    canRegisterSettlementPersonalCashFlow(fromUserId, toUserId, currentUserId);

  const personalAccountOptions = useMemo(
    () => activeAccountsMatchingCurrency(personalAccounts, currency),
    [personalAccounts, currency],
  );

  const annotatePersonalForSubmit = showPersonalCashFlow && annotatePersonalCash;
  const effectivePersonalAccountId = useMemo(() => {
    if (!annotatePersonalForSubmit) {
      return '';
    }
    return resolvePersonalAccountSelection(
      currentUserId,
      personalAccountOptions,
      personalAccountId,
    );
  }, [annotatePersonalForSubmit, currentUserId, personalAccountOptions, personalAccountId]);

  const maySubmit =
    fromUserId &&
    toUserId &&
    fromUserId !== toUserId &&
    canRegisterSettlement(actorRole, currentUserId, fromUserId, toUserId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const normalized = normalizeAmountInput(amount);
    if (!isPositiveAmount(normalized)) {
      setFormError('Importe positivo con hasta 4 decimales.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency.trim())) {
      setFormError('Moneda ISO 4217 de 3 letras.');
      return;
    }
    if (!maySubmit) {
      setFormError('No puedes registrar este pago con tu rol en el espacio.');
      return;
    }
    if (annotatePersonalForSubmit && !effectivePersonalAccountId) {
      setFormError('Selecciona una cuenta personal o desmarca la anotación.');
      return;
    }

    setPending(true);
    try {
      const result = await createSettlement(spaceId, {
        fromUserId,
        toUserId,
        amount: normalized,
        currency: currency.trim().toUpperCase(),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        ...(annotatePersonalForSubmit && effectivePersonalAccountId
          ? { personalCashFlow: { accountId: effectivePersonalAccountId } }
          : {}),
      });
      if (annotatePersonalForSubmit && effectivePersonalAccountId) {
        writeLastPersonalAccountId(currentUserId, effectivePersonalAccountId);
      }
      const warning = result.warnings?.[0];
      router.push(settlementsHref(spaceId, warning ? { warning } : undefined));
      router.refresh();
    } catch (error) {
      setFormError(settlementActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.meta}>Wealthspace no realiza ni verifica pagos.</p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="settlement-from" label="Quién paga (deudor)">
        <select
          id="settlement-from"
          className={styles.selectNative}
          value={fromUserId}
          onChange={(event) => {
            setFromUserId(event.target.value);
            setAnnotatePersonalCash(false);
            setPersonalAccountId('');
          }}
          disabled={pending}
          required
        >
          <option value="">Selecciona…</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
      </Field>
      <Field id="settlement-to" label="Quién cobra (acreedor)">
        <select
          id="settlement-to"
          className={styles.selectNative}
          value={toUserId}
          onChange={(event) => {
            setToUserId(event.target.value);
            setAnnotatePersonalCash(false);
            setPersonalAccountId('');
          }}
          disabled={pending}
          required
        >
          <option value="">Selecciona…</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
      </Field>
      <Field id="settlement-amount" label="Importe">
        <TextInput
          id="settlement-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="settlement-currency" label="Moneda">
        <TextInput
          id="settlement-currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          disabled={pending}
          maxLength={3}
          required
        />
      </Field>
      <Field id="settlement-occurred" label="Fecha del pago (opcional)">
        <TextInput
          id="settlement-occurred"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          disabled={pending}
        />
      </Field>
      {showPersonalCashFlow && actorSide ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Mi cuenta personal (opcional)</legend>
          <p className={styles.meta}>{settlementPersonalCashFlowHint(actorSide)}</p>
          <label className={styles.checkRow} htmlFor="settlement-annotate-personal">
            <input
              id="settlement-annotate-personal"
              type="checkbox"
              checked={annotatePersonalCash}
              onChange={(event) => setAnnotatePersonalCash(event.target.checked)}
              disabled={pending}
            />
            <span>Anotar en mi cuenta personal al registrar</span>
          </label>
          {annotatePersonalCash ? (
            personalAccountOptions.length === 0 ? (
              <p className={styles.meta} role="status">
                No tienes cuentas personales activas en{' '}
                {currency.trim().toUpperCase() || 'esta moneda'}.
              </p>
            ) : (
              <Field id="settlement-personal-account" label="Cuenta personal">
                <select
                  id="settlement-personal-account"
                  className={styles.selectNative}
                  value={effectivePersonalAccountId}
                  onChange={(event) => setPersonalAccountId(event.target.value)}
                  disabled={pending}
                  required
                >
                  {personalAccountOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} ({row.currency})
                    </option>
                  ))}
                </select>
              </Field>
            )
          ) : null}
        </fieldset>
      ) : null}
      <Button type="submit" disabled={pending || !maySubmit}>
        {pending ? 'Guardando…' : 'Registrar pago'}
      </Button>
    </form>
  );
}
