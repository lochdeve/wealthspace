import Link from 'next/link';
import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import { expenseTitle, splitModeLabel } from '@/lib/finance/shared-expense-view';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import {
  sharedExpenseDetailHref,
  sharedExpensesHref,
  sharedExpenseHref,
} from '@/lib/finance/routes';
import styles from './finance-forms.module.css';

type SharedExpensesListPanelProps = {
  spaceId: string;
  expenses: SharedExpenseDetail[];
  includeVoided: boolean;
};

export function SharedExpensesListPanel({
  spaceId,
  expenses,
  includeVoided,
}: SharedExpensesListPanelProps) {
  return (
    <section aria-labelledby="shared-expenses-list-title">
      <h2 id="shared-expenses-list-title" className={styles.sectionTitle}>
        Gastos compartidos
      </h2>
      <nav className={styles.inlineActions} aria-label="Filtros del listado">
        <Link
          href={sharedExpensesHref(spaceId)}
          aria-current={includeVoided ? undefined : 'page'}
          style={{ fontWeight: includeVoided ? undefined : 600 }}
        >
          Activos
        </Link>
        <Link
          href={sharedExpensesHref(spaceId, { includeVoided: true })}
          aria-current={includeVoided ? 'page' : undefined}
          style={{ fontWeight: includeVoided ? 600 : undefined }}
        >
          Incluir anulados
        </Link>
        <Link href={sharedExpenseHref(spaceId)}>Registrar gasto</Link>
      </nav>
      {expenses.length === 0 ? (
        <p className={styles.meta}>
          {includeVoided
            ? 'No hay gastos compartidos con este filtro.'
            : 'Todavía no hay gastos compartidos. Registra el primero cuando repartáis un gasto.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {expenses.map((expense) => {
            const voided = Boolean(expense.voidedAt);
            return (
              <li key={expense.id} className={styles.listItem}>
                <div className={styles.listItemHeader}>
                  <strong>{expenseTitle(expense.description)}</strong>
                  <span>{formatMoneyAmount(expense.totalAmount, expense.currency)}</span>
                </div>
                {voided ? (
                  <p className={styles.meta}>
                    <strong>Anulado</strong>
                    {expense.voidedAt
                      ? ` · ${new Date(expense.voidedAt).toLocaleString('es')}`
                      : null}
                  </p>
                ) : null}
                <p className={styles.meta}>
                  {new Date(expense.occurredAt).toLocaleString('es')} ·{' '}
                  {splitModeLabel(expense.splitMode)}
                </p>
                <p>
                  <Link href={sharedExpenseDetailHref(spaceId, expense.id)}>Ver detalle</Link>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
