import type { GeneratedDebt, SharedExpenseParticipant } from '@/lib/api/shared-expense-types';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type MemberOption = { userId: string; displayName: string };

type SharedExpensePreviewPanelProps = {
  active: boolean;
  loading: boolean;
  error: string | null;
  participants: SharedExpenseParticipant[] | null;
  generatedDebts: GeneratedDebt[] | null;
  members: MemberOption[];
};

function memberName(members: MemberOption[], userId: string): string {
  return members.find((row) => row.userId === userId)?.displayName ?? userId;
}

export function SharedExpensePreviewPanel({
  active,
  loading,
  error,
  participants,
  generatedDebts,
  members,
}: SharedExpensePreviewPanelProps) {
  return (
    <section className={styles.metaBox} aria-live="polite" aria-busy={active && loading ? true : undefined}>
      <h3 className={styles.sectionTitle}>Previsualización del reparto</h3>
      {!active ? (
        <p className={styles.meta}>Completa importe y participantes para ver la previsualización.</p>
      ) : null}
      {active && loading ? <p className={styles.meta}>Calculando…</p> : null}
      {active && error ? (
        <p className={ui.alert} role="alert">
          {error}
        </p>
      ) : null}
      {active && !loading && !error && participants && participants.length > 0 ? (
        <>
          <ul className={styles.list}>
            {participants.map((row) => (
              <li key={row.userId} className={styles.listItem}>
                <div className={styles.listItemHeader}>
                  <span>{row.displayName}</span>
                  <strong>
                    {row.allocatedAmount} {row.sharePercent ? `(${row.sharePercent} %)` : ''}
                  </strong>
                </div>
              </li>
            ))}
          </ul>
          {generatedDebts && generatedDebts.length > 0 ? (
            <div className={styles.metaBox}>
              <p className={styles.legend}>Deudas generadas</p>
              <ul className={styles.list}>
                {generatedDebts.map((debt, index) => (
                  <li key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className={styles.meta}>
                    {memberName(members, debt.fromUserId)} debe {debt.amount} a{' '}
                    {memberName(members, debt.toUserId)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.meta}>Este pago no genera deudas entre miembros.</p>
          )}
        </>
      ) : active && !loading && !error ? (
        <p className={styles.meta}>Ajusta el reparto si hace falta; los importes los calcula el servidor.</p>
      ) : null}
    </section>
  );
}