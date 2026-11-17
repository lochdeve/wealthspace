'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { MembershipRole, SpaceMember } from '@/lib/api/space-types';
import { createSettlement } from '@/lib/api/settlements';
import { isPositiveAmount, normalizeAmountInput } from '@/lib/finance/amount';
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
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

    setPending(true);
    try {
      const result = await createSettlement(spaceId, {
        fromUserId,
        toUserId,
        amount: normalized,
        currency: currency.trim().toUpperCase(),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      });
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
          onChange={(event) => setFromUserId(event.target.value)}
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
          onChange={(event) => setToUserId(event.target.value)}
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
      <Button type="submit" disabled={pending || !maySubmit}>
        {pending ? 'Guardando…' : 'Registrar pago'}
      </Button>
    </form>
  );
}