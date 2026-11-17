import type { Account } from '@/lib/api/finance-types';
import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import type { SpaceMember } from '@/lib/api/space-types';
import {
  expenseTitle,
  findParticipantShare,
  splitModeLabel,
  viewerDebtLines,
} from '@/lib/finance/shared-expense-view';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type SharedExpenseDetailPanelProps = {
  expense: SharedExpenseDetail;
  viewerUserId: string;
  members: SpaceMember[];
  accounts: Account[];
};

function memberName(members: SpaceMember[], userId: string): string {
  return members.find((row) => row.userId === userId)?.displayName ?? userId;
}

function accountName(accounts: Account[], accountId: string): string {
  return accounts.find((row) => row.id === accountId)?.name ?? accountId;
}

export function SharedExpenseDetailPanel({
  expense,
  viewerUserId,
  members,
  accounts,
}: SharedExpenseDetailPanelProps) {
  const voided = Boolean(expense.voidedAt);
  const yourShare = findParticipantShare(viewerUserId, expense.participants);
  const viewerDebts = viewerDebtLines(viewerUserId, expense.currency, expense.generatedDebts, (id) =>
    memberName(members, id),
  );

  const paymentLabel =
    expense.payment.source === 'MEMBER'
      ? `Pagado por ${memberName(members, expense.payment.paidByUserId)}`
      : `Pagado desde la cuenta ${accountName(accounts, expense.payment.accountId)}`;

  return (
    <section aria-labelledby="shared-expense-detail-title">
      {voided ? (
        <p className={ui.alert} role="status">
          <strong>Anulado</strong>
          {expense.voidedAt ? ` el ${new Date(expense.voidedAt).toLocaleString('es')}` : ''}. Las deudas
          que generó ya no cuentan.
        </p>
      ) : null}
      <h2 id="shared-expense-detail-title" className={styles.sectionTitle}>
        {expenseTitle(expense.description)}
      </h2>
      <p className={styles.balanceDisplay}>
        {formatMoneyAmount(expense.totalAmount, expense.currency)}
      </p>
      <p className={styles.meta}>{new Date(expense.occurredAt).toLocaleString('es')}</p>
      <p className={styles.meta}>
        {paymentLabel} · {splitModeLabel(expense.splitMode)}
      </p>

      {yourShare ? (
        <div className={styles.metaBox}>
          <p className={styles.legend}>Tu parte</p>
          <p className={styles.balanceDisplay}>
            {formatMoneyAmount(yourShare.allocatedAmount, expense.currency)}
          </p>
          {yourShare.sharePercent ? (
            <p className={styles.meta}>{yourShare.sharePercent} % del total</p>
          ) : null}
        </div>
      ) : (
        <p className={styles.meta}>No participaste en este gasto.</p>
      )}

      {!voided && viewerDebts.length > 0 ? (
        <div className={styles.metaBox}>
          <p className={styles.legend}>Resumen para ti</p>
          <ul className={styles.list}>
            {viewerDebts.map((line) => (
              <li key={line} className={styles.meta}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : !voided && expense.generatedDebts.length === 0 ? (
        <p className={styles.meta}>Este gasto no genera deudas entre miembros.</p>
      ) : null}

      <div className={styles.metaBox}>
        <p className={styles.legend}>Reparto</p>
        <ul className={styles.list}>
          {expense.participants.map((row) => (
            <li key={row.userId} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <span>{row.displayName}</span>
                <strong>{formatMoneyAmount(row.allocatedAmount, expense.currency)}</strong>
              </div>
              {row.sharePercent ? <p className={styles.meta}>{row.sharePercent} %</p> : null}
            </li>
          ))}
        </ul>
      </div>

      {expense.generatedDebts.length > 0 ? (
        <div className={styles.metaBox}>
          <p className={styles.legend}>Deudas generadas por este gasto</p>
          {voided ? (
            <p className={styles.meta}>Solo informativo: el gasto está anulado.</p>
          ) : null}
          <ul className={styles.list}>
            {expense.generatedDebts.map((debt, index) => (
              <li key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className={styles.meta}>
                {memberName(members, debt.fromUserId)} debe{' '}
                {formatMoneyAmount(debt.amount, expense.currency)} a {memberName(members, debt.toUserId)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}