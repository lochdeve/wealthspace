import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { getTransactionWithCookie } from '@/lib/api/transactions';
import { categoryOptionLabel } from '@/lib/finance/category-options';
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

  let transaction;
  try {
    transaction = await getTransactionWithCookie(spaceId, transactionId, cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  const categories =
    transaction.categoryId !== undefined && transaction.categoryId !== null
      ? await listCategoriesWithCookie(spaceId, cookieHeader)
      : [];
  const categoryLabel =
    transaction.categoryId !== undefined && transaction.categoryId !== null
      ? categoryOptionLabel(
          categories.find((row) => row.id === transaction.categoryId) ?? {
            id: transaction.categoryId,
            type: 'EXPENSE',
            name: transaction.categoryId,
            createdAt: '',
            updatedAt: '',
          },
          categories,
        )
      : null;

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
          {categoryLabel ? (
            <p className={styles.lead}>Categoría: {categoryLabel}</p>
          ) : transaction.type === 'INCOME' || transaction.type === 'EXPENSE' ? (
            <p className={styles.lead}>Sin categoría asignada</p>
          ) : null}
        </div>
        <Link href={backHref}>← Cuenta</Link>
      </header>
      <EditTransactionForm spaceId={spaceId} transaction={transaction} />
    </article>
  );
}
