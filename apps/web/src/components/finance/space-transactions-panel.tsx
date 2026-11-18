import Link from 'next/link';
import type { Account, FinancialTransaction, TransactionType } from '@/lib/api/finance-types';
import type { SpaceMember } from '@/lib/api/space-types';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { transactionTypeLabel } from '@/lib/finance/labels';
import { transactionContextLine } from '@/lib/finance/transaction-summary';
import styles from './finance-forms.module.css';

type SpaceTransactionsPanelProps = {
  spaceId: string;
  transactions: FinancialTransaction[];
  activeType?: TransactionType;
  accounts?: Account[];
  members?: SpaceMember[];
};

const TYPE_FILTERS: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'TRANSFER', label: 'Transferencias' },
  { value: 'OPENING_BALANCE', label: 'Saldos iniciales' },
];

export function SpaceTransactionsPanel({
  spaceId,
  transactions,
  activeType,
  accounts = [],
  members = [],
}: SpaceTransactionsPanelProps) {
  const accountName = (accountId: string) =>
    accounts.find((row) => row.id === accountId)?.name ?? 'Cuenta';
  const memberName = (userId: string) =>
    members.find((row) => row.userId === userId)?.displayName ?? 'Miembro';
  return (
    <section aria-labelledby="space-transactions-title">
      <h2 id="space-transactions-title" className={styles.sectionTitle}>
        Movimientos
      </h2>
      <nav className={styles.inlineActions} aria-label="Filtrar por tipo">
        {TYPE_FILTERS.map((filter) => {
          const href =
            filter.value === ''
              ? `/spaces/${spaceId}/transactions`
              : `/spaces/${spaceId}/transactions?type=${filter.value}`;
          const isActive = (filter.value || undefined) === (activeType || undefined);
          return (
            <Link
              key={filter.label}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              style={{ fontWeight: isActive ? 600 : undefined }}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>
      {transactions.length === 0 ? (
        <p className={styles.meta}>No hay movimientos con este filtro.</p>
      ) : (
        <ul className={styles.list}>
          {transactions.map((tx) => {
            const context = transactionContextLine(tx, accountName, memberName);
            return (
            <li key={tx.id} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <strong>{transactionTypeLabel(tx.type)}</strong>
                <span>{formatMoneyAmount(tx.amount, tx.currency)}</span>
              </div>
              {tx.description ? <p className={styles.meta}>{tx.description}</p> : null}
              {context ? <p className={styles.meta}>{context}</p> : null}
              <p className={styles.meta}>
                Fecha: {new Date(tx.occurredAt).toLocaleString('es')}
                {tx.createdAt !== tx.occurredAt
                  ? ` · Registro: ${new Date(tx.createdAt).toLocaleString('es')}`
                  : ''}
              </p>
              <p>
                <Link href={`/spaces/${spaceId}/transactions/${tx.id}`}>Ver / editar</Link>
              </p>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
