'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import { voidSharedExpense } from '@/lib/api/shared-expenses';
import { sharedExpenseActionErrorMessage } from '@/lib/finance/shared-expense-messages';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type VoidSharedExpenseFormProps = {
  spaceId: string;
  expenseId: string;
  expectedVersion: number;
};

export function VoidSharedExpenseForm({
  spaceId,
  expenseId,
  expectedVersion,
}: VoidSharedExpenseFormProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleVoid() {
    setFormError(null);
    const accepted = window.confirm(
      '¿Anular este gasto compartido? Las deudas que generó dejarán de contar.',
    );
    if (!accepted) {
      return;
    }

    setPending(true);
    try {
      await voidSharedExpense(spaceId, expenseId, {
        expectedVersion,
        reason: reason.trim() || undefined,
      });
      router.refresh();
    } catch (error) {
      const message = sharedExpenseActionErrorMessage(error);
      if (error instanceof ApiError && (error.code === 'VERSION_CONFLICT' || error.code === 'ALREADY_VOIDED')) {
        router.refresh();
      }
      setFormError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.metaBox} aria-labelledby="void-shared-expense-title">
      <h2 id="void-shared-expense-title" className={styles.sectionTitle}>
        Anular gasto
      </h2>
      <p className={styles.meta}>La anulación es definitiva: no borra el registro, pero revierte sus efectos.</p>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <div className={styles.form}>
        <Field id="void-reason" label="Motivo (opcional)">
          <TextInput
            id="void-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending}
          />
        </Field>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void handleVoid()}>
          {pending ? 'Anulando…' : 'Anular gasto compartido'}
        </Button>
      </div>
    </section>
  );
}