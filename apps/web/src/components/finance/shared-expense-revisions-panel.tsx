import type { SharedExpenseRevision } from '@/lib/api/shared-expense-types';
import type { SpaceMember } from '@/lib/api/space-types';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import styles from './finance-forms.module.css';

type SharedExpenseRevisionsPanelProps = {
  revisions: SharedExpenseRevision[];
  members: SpaceMember[];
};

function memberName(members: SpaceMember[], userId: string): string {
  return members.find((row) => row.userId === userId)?.displayName ?? userId;
}

function revisionTotalLine(snapshot: Record<string, unknown>): string | null {
  const total = typeof snapshot.totalAmount === 'string' ? snapshot.totalAmount : null;
  const currency = typeof snapshot.currency === 'string' ? snapshot.currency : '';
  if (!total) {
    return null;
  }
  const voided = snapshot.voidedAt ? ' · anulado' : '';
  return `${formatMoneyAmount(total, currency)}${voided}`;
}

export function SharedExpenseRevisionsPanel({
  revisions,
  members,
}: SharedExpenseRevisionsPanelProps) {
  if (revisions.length === 0) {
    return (
      <section className={styles.metaBox} aria-labelledby="shared-expense-revisions-title">
        <h2 id="shared-expense-revisions-title" className={styles.sectionTitle}>
          Historial de cambios
        </h2>
        <p className={styles.meta}>Todavía no hay revisiones guardadas (solo el estado actual).</p>
      </section>
    );
  }

  return (
    <section className={styles.metaBox} aria-labelledby="shared-expense-revisions-title">
      <h2 id="shared-expense-revisions-title" className={styles.sectionTitle}>
        Historial de cambios
      </h2>
      <ul className={styles.list}>
        {revisions.map((revision) => {
          const summary = revisionTotalLine(revision.snapshot);
          return (
            <li key={revision.revisionNumber} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <strong>Revisión {revision.revisionNumber}</strong>
                <span>{new Date(revision.changedAt).toLocaleString('es')}</span>
              </div>
              <p className={styles.meta}>
                Por {memberName(members, revision.changedByUserId)}
                {revision.reason ? ` · ${revision.reason}` : ''}
              </p>
              {summary ? <p className={styles.meta}>Antes: {summary}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
