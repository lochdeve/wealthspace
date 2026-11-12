import Link from 'next/link';
import type { FinancialTransaction } from '@/lib/api/finance-types';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { transactionTypeLabel } from '@/lib/finance/labels';
import styles from './finance-forms.module.css';

type AccountTransactionsListProps = {
  spaceId: string;
  transactions: FinancialTransaction[];
};

export function AccountTransactionsList({ spaceId, transactions }: AccountTransactionsListProps) {
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
          <p className={styles.meta}>{new Date(tx.occurredAt).toLocaleString('es')}</p>
          <p>
            <Link href={`/spaces/${spaceId}/transactions/${tx.id}`}>Ver / editar</Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
