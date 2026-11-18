import Link from 'next/link';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { getAccountWithCookie } from '@/lib/api/accounts';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { listTransactionsWithCookie } from '@/lib/api/transactions';
import { AccountTransactionsList } from '@/components/finance/account-transactions-list';
import { OpeningBalanceForm } from '@/components/finance/opening-balance-form';
import { RecordCashflowForm } from '@/components/finance/record-cashflow-form';
import { ArchiveAccountButton } from '@/components/finance/archive-account-button';
import { RecordTransferForm } from '@/components/finance/record-transfer-form';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { individualExpenseHref } from '@/lib/finance/routes';
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

  const [transactions, openingBalanceRows, allAccounts, incomeCategories, expenseCategories, members] =
    await Promise.all([
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
          {account.archivedAt ? (
            <p className={styles.lead} role="status">
              Cuenta archivada — no admite nuevos movimientos.
            </p>
          ) : null}
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={`/spaces/${spaceId}/accounts`}>← Cuentas</Link>
        </nav>
      </header>

      {!account.archivedAt ? (
        <div className={styles.stack}>
          {!hasOpeningBalance ? (
            <OpeningBalanceForm
              spaceId={spaceId}
              accountId={accountId}
              currency={account.currency}
            />
          ) : (
            <p className={styles.lead}>Saldo inicial ya registrado.</p>
          )}
          <RecordCashflowForm
            spaceId={spaceId}
            accountId={accountId}
            kind="INCOME"
            categories={incomeCategories}
          />
          {space.type === 'SHARED' ? (
            <section className={financeStyles.form} aria-labelledby="account-expense-title">
              <h3 id="account-expense-title" className={financeStyles.sectionTitle}>
                Registrar gasto
              </h3>
              <p className={financeStyles.meta}>
                En un espacio compartido, el gasto se imputa a una persona como «Gasto individual» y
                descuenta el saldo de esta cuenta.
              </p>
              <p>
                <Link href={individualExpenseHref(spaceId, accountId)}>
                  Registrar gasto individual con esta cuenta
                </Link>
              </p>
            </section>
          ) : (
            <RecordCashflowForm
              spaceId={spaceId}
              accountId={accountId}
              kind="EXPENSE"
              categories={expenseCategories}
            />
          )}
          <RecordTransferForm
            spaceId={spaceId}
            sourceAccount={account}
            destinationAccounts={transferTargets}
          />
        </div>
      ) : null}

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Movimientos recientes</h2>
        <AccountTransactionsList
          spaceId={spaceId}
          transactions={transactions}
          accounts={allAccounts}
          members={members}
        />
      </div>

      {!account.archivedAt ? (
        <ArchiveAccountButton spaceId={spaceId} accountId={accountId} accountName={account.name} />
      ) : null}
    </article>
  );
}
