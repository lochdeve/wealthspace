import Link from 'next/link';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { getTransactionWithCookie } from '@/lib/api/transactions';
import { categoryOptionLabel } from '@/lib/finance/category-options';
import { CrossSpaceSummaryBadge } from '@/components/finance/cross-space-summary-badge';
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
    rethrowUnlessSpaceFound(error);
  }

  let transaction;
  try {
    transaction = await getTransactionWithCookie(spaceId, transactionId, cookieHeader);
  } catch (error) {
    rethrowUnlessSpaceFound(error);
  }

  const categoryType =
    transaction.type === 'INCOME' ? 'INCOME' : transaction.type === 'EXPENSE' ? 'EXPENSE' : null;
  const categories = categoryType
    ? await listCategoriesWithCookie(spaceId, cookieHeader, categoryType)
    : [];
  const categoryLabel =
    transaction.categoryId !== undefined && transaction.categoryId !== null
      ? categoryOptionLabel(
          categories.find((row) => row.id === transaction.categoryId) ?? {
            id: transaction.categoryId,
            type: categoryType ?? 'EXPENSE',
            name: 'Categoría',
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
          {transaction.crossSpaceSummary ? (
            <CrossSpaceSummaryBadge summary={transaction.crossSpaceSummary} />
          ) : null}
        </div>
        <Link href={backHref}>← Cuenta</Link>
      </header>
      <EditTransactionForm spaceId={spaceId} transaction={transaction} categories={categories} />
    </article>
  );
}
