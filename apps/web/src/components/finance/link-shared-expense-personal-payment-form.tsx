'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import type { Account } from '@/lib/api/finance-types';
import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import { ApiError } from '@/lib/api/errors';
import { linkSharedExpensePersonalPayment } from '@/lib/api/shared-expenses';
import { activeAccountsMatchingCurrency } from '@/lib/finance/personal-cash-link';
import { sharedExpenseActionErrorMessage } from '@/lib/finance/shared-expense-messages';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type LinkSharedExpensePersonalPaymentFormProps = {
  spaceId: string;
  expense: SharedExpenseDetail;
  personalAccounts: Account[];
};

export function LinkSharedExpensePersonalPaymentForm({
  spaceId,
  expense,
  personalAccounts,
}: LinkSharedExpensePersonalPaymentFormProps) {
  const router = useRouter();
  const options = useMemo(
    () => activeAccountsMatchingCurrency(personalAccounts, expense.currency),
    [personalAccounts, expense.currency],
  );
  const [personalAccountId, setPersonalAccountId] = useState(() => options[0]?.id ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!personalAccountId) {
      setFormError('Selecciona una cuenta personal.');
      return;
    }

    setPending(true);
    try {
      await linkSharedExpensePersonalPayment(spaceId, expense.id, {
        personalAccountId,
        expectedVersion: expense.version,
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        router.refresh();
      }
      setFormError(sharedExpenseActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (options.length === 0) {
    return (
      <section className={styles.metaBox} aria-labelledby="link-personal-payment-title">
        <h2 id="link-personal-payment-title" className={styles.sectionTitle}>
          Vincular pago personal
        </h2>
        <p className={styles.meta} role="status">
          No tienes cuentas personales activas en {expense.currency}. Crea una en tu espacio
          personal o elige otra moneda al vincular más adelante.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.metaBox} aria-labelledby="link-personal-payment-title">
      <h2 id="link-personal-payment-title" className={styles.sectionTitle}>
        Vincular pago personal
      </h2>
      <p className={styles.meta}>
        Registra la salida del importe total ({expense.currency}) en tu cuenta personal. Puedes
        hacerlo ahora o más tarde desde aquí.
      </p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field id="link-personal-account" label="Cuenta personal">
          <select
            id="link-personal-account"
            className={styles.selectNative}
            value={personalAccountId}
            onChange={(event) => setPersonalAccountId(event.target.value)}
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
          {pending ? 'Vinculando…' : 'Vincular pago personal'}
        </Button>
      </form>
    </section>
  );
}
