'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import type { Account } from '@/lib/api/finance-types';
import type { Settlement } from '@/lib/api/settlement-types';
import { linkSettlementPersonalCashFlow } from '@/lib/api/settlements';
import {
  activeAccountsMatchingCurrency,
  settlementPersonalCashFlowHint,
} from '@/lib/finance/personal-cash-link';
import {
  resolvePersonalAccountSelection,
  writeLastPersonalAccountId,
} from '@/lib/finance/last-personal-account';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { settlementActionErrorMessage } from '@/lib/finance/settlement-messages';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type LinkSettlementPersonalCashFlowFormProps = {
  spaceId: string;
  settlement: Settlement;
  personalAccounts: Account[];
  currentUserId: string;
  counterpartyName: string;
  variant?: 'banner' | 'inline';
};

export function LinkSettlementPersonalCashFlowForm({
  spaceId,
  settlement,
  personalAccounts,
  currentUserId,
  counterpartyName,
  variant = 'inline',
}: LinkSettlementPersonalCashFlowFormProps) {
  const router = useRouter();
  const side = settlement.myPersonalCashLink?.side ?? 'to';
  const options = useMemo(
    () => activeAccountsMatchingCurrency(personalAccounts, settlement.currency),
    [personalAccounts, settlement.currency],
  );
  const [accountId, setAccountId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const effectiveAccountId = useMemo(
    () => resolvePersonalAccountSelection(currentUserId, options, accountId),
    [currentUserId, options, accountId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!effectiveAccountId) {
      setFormError('Selecciona una cuenta personal.');
      return;
    }

    setPending(true);
    try {
      await linkSettlementPersonalCashFlow(spaceId, settlement.id, {
        accountId: effectiveAccountId,
        expectedVersion: settlement.version,
      });
      writeLastPersonalAccountId(currentUserId, effectiveAccountId);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        router.refresh();
      }
      setFormError(settlementActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (options.length === 0) {
    return (
      <p className={styles.meta} role="status">
        No tienes cuentas personales activas en {settlement.currency} para anotar este cobro.
      </p>
    );
  }

  const lead =
    side === 'to'
      ? `${counterpartyName} registró un pago hacia ti. ¿Anotar ${formatMoneyAmount(settlement.amount, settlement.currency)} en tu cuenta personal?`
      : `¿Anotar ${formatMoneyAmount(settlement.amount, settlement.currency)} en tu cuenta personal? ${settlementPersonalCashFlowHint(side)}`;

  return (
    <div className={variant === 'banner' ? styles.metaBox : undefined}>
      <p className={styles.meta}>{lead}</p>
      <p className={styles.meta}>{settlementPersonalCashFlowHint(side)}</p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <form className={styles.inlineActions} onSubmit={handleSubmit} noValidate>
        <Field id={`link-settlement-account-${settlement.id}`} label="Cuenta personal">
          <select
            id={`link-settlement-account-${settlement.id}`}
            className={styles.selectNative}
            value={effectiveAccountId}
            onChange={(event) => setAccountId(event.target.value)}
            disabled={pending}
            required
          >
            {options.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.currency})
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? 'Anotando…' : 'Anotar en mi cuenta'}
        </Button>
      </form>
    </div>
  );
}
