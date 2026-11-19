import Link from 'next/link';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { getAccountWithCookie, listAccountsWithCookie } from '@/lib/api/accounts';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { listTransactionsWithCookie } from '@/lib/api/transactions';
import { AccountDetailOperations } from '@/components/finance/account-detail-operations';
import { AccountTransactionsList } from '@/components/finance/account-transactions-list';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { spaceTransactionsHref } from '@/lib/finance/routes';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';
import financeStyles from '@/components/finance/finance-forms.module.css';

type PageProps = {
  params: Promise<{ spaceId: string; accountId: string }>;
};

export default async function AccountDetailPage({ params }: PageProps) {
  await requireUser();
  const { spaceId, accountId } = await params;
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

  let account;
  try {
    account = await getAccountWithCookie(spaceId, accountId, cookieHeader);
  } catch (error) {
    rethrowUnlessSpaceFound(error);
  }

  const [
    transactions,
    openingBalanceRows,
    allAccounts,
    incomeCategories,
    expenseCategories,
    members,
  ] = await Promise.all([
    listTransactionsWithCookie(spaceId, cookieHeader, { accountId, limit: 30 }),
    listTransactionsWithCookie(spaceId, cookieHeader, {
      accountId,
      type: 'OPENING_BALANCE',
      limit: 1,
    }),
    listAccountsWithCookie(spaceId, cookieHeader),
    listCategoriesWithCookie(spaceId, cookieHeader, 'INCOME'),
    listCategoriesWithCookie(spaceId, cookieHeader, 'EXPENSE'),
    space.type === 'SHARED'
      ? listSpaceMembersWithCookie(spaceId, cookieHeader)
      : Promise.resolve([]),
  ]);
  const hasOpeningBalance = openingBalanceRows.length > 0;
  const transferTargets = allAccounts.filter(
    (row) => row.id !== accountId && !row.archivedAt && row.currency === account.currency,
  );

  return (
    <article aria-labelledby="account-detail-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.badge}>{account.currency}</p>
          <h1 id="account-detail-title" className={styles.title}>
            {account.name}
          </h1>
          <p className={financeStyles.balanceDisplay}>
            Saldo: {formatMoneyAmount(account.balance, account.currency)}
          </p>
          <p className={styles.lead}>
            Alta: {new Date(account.createdAt).toLocaleDateString('es')}
            {account.archivedAt ? ' · Archivada' : ''}
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={spaceTransactionsHref(spaceId, { accountId })}>Historial de la cuenta</Link>
          <Link href={spaceTransactionsHref(spaceId)}>Movimientos del espacio</Link>
          <Link href={`/spaces/${spaceId}/categories`}>Categorías</Link>
          <Link href={`/spaces/${spaceId}/accounts`}>← Cuentas</Link>
        </nav>
      </header>

      <AccountDetailOperations
        spaceId={spaceId}
        spaceType={space.type}
        account={account}
        hasOpeningBalance={hasOpeningBalance}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        transferTargets={transferTargets}
      />

      <section className={styles.section} aria-labelledby="account-tx-title">
        <h2 id="account-tx-title" className={styles.sectionHeading}>
          Movimientos recientes
        </h2>
        <AccountTransactionsList
          spaceId={spaceId}
          transactions={transactions}
          accounts={allAccounts}
          members={members}
        />
        <p className={financeStyles.meta}>
          <Link href={spaceTransactionsHref(spaceId, { accountId })}>Ver historial completo</Link>
        </p>
      </section>
    </article>
  );
}
