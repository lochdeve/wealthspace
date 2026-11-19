import Link from 'next/link';
import type { Account, FinancialTransaction } from '@/lib/api/finance-types';
import type { SpaceMember } from '@/lib/api/space-types';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { transactionTypeLabel } from '@/lib/finance/labels';
import { CrossSpaceSummaryBadge } from '@/components/finance/cross-space-summary-badge';
import { transactionContextLine } from '@/lib/finance/transaction-summary';
import styles from './finance-forms.module.css';

type AccountTransactionsListProps = {
  spaceId: string;
  transactions: FinancialTransaction[];
  accounts?: Account[];
  members?: SpaceMember[];
};

export function AccountTransactionsList({
  spaceId,
  transactions,
  accounts = [],
  members = [],
}: AccountTransactionsListProps) {
  const resolveAccount = (id: string) => accounts.find((row) => row.id === id)?.name ?? 'Cuenta';
  const memberName = (userId: string) =>
    members.find((row) => row.userId === userId)?.displayName ?? 'Miembro';
  if (transactions.length === 0) {
    return <p className={styles.meta}>Aún no hay movimientos en esta cuenta.</p>;
  }

  return (
    <ul className={styles.list} aria-label="Movimientos recientes">
      {transactions.map((tx) => (
        <li key={tx.id} className={styles.listItem}>
          <div className={styles.listItemHeader}>
            <strong>{transactionTypeLabel(tx.type)}</strong>
            <span>{formatMoneyAmount(tx.amount, tx.currency)}</span>
          </div>
          {tx.description ? <p className={styles.meta}>{tx.description}</p> : null}
          {transactionContextLine(tx, resolveAccount, memberName) ? (
            <p className={styles.meta}>{transactionContextLine(tx, resolveAccount, memberName)}</p>
          ) : null}
          {tx.crossSpaceSummary ? (
            <CrossSpaceSummaryBadge summary={tx.crossSpaceSummary} />
          ) : null}
          <p className={styles.meta}>{new Date(tx.occurredAt).toLocaleString('es')}</p>
          <p>
            <Link href={`/spaces/${spaceId}/transactions/${tx.id}`}>Ver / editar</Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
