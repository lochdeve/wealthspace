import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { getTransactionWithCookie } from '@/lib/api/transactions';
import { EditTransactionForm } from '@/components/finance/edit-transaction-form';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { transactionTypeLabel } from '@/lib/finance/labels';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string; transactionId: string }>;
};

export default async function TransactionDetailPage({ params }: PageProps) {
  await requireUser();
  const { spaceId, transactionId } = await params;
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  let space;
  try {
    space = await getSpaceWithCookie(spaceId, cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  if (space.type !== 'PERSONAL') {
    notFound();
  }

  let transaction;
  try {
    transaction = await getTransactionWithCookie(spaceId, transactionId, cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  const accountId =
    transaction.accountId ?? transaction.sourceAccountId ?? transaction.destinationAccountId;
  const backHref =
    accountId !== null && accountId !== undefined
      ? `/spaces/${spaceId}/accounts/${accountId}`
      : `/spaces/${spaceId}/accounts`;

  return (
    <article aria-labelledby="transaction-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.badge}>{transactionTypeLabel(transaction.type)}</p>
          <h1 id="transaction-title" className={styles.title}>
            Movimiento
          </h1>
          <p className={styles.lead}>
            {formatMoneyAmount(transaction.amount, transaction.currency)}
          </p>
        </div>
        <Link href={backHref}>← Cuenta</Link>
      </header>
      <EditTransactionForm spaceId={spaceId} transaction={transaction} />
    </article>
  );
}
