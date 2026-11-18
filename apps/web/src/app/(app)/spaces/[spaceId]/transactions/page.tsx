import Link from 'next/link';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import type { TransactionType } from '@/lib/api/finance-types';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listTransactionsWithCookie } from '@/lib/api/transactions';
import { getAccountWithCookie } from '@/lib/api/accounts';
import { individualExpenseHref, sharedExpenseHref } from '@/lib/finance/routes';
import { SpaceTransactionsPanel } from '@/components/finance/space-transactions-panel';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

const VALID_TYPES = new Set<TransactionType>(['INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_BALANCE']);

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ type?: string; accountId?: string }>;
};

export default async function SpaceTransactionsPage({ params, searchParams }: PageProps) {
  await requireUser();
  const { spaceId } = await params;
  const { type: typeParam, accountId } = await searchParams;
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

  const type =
    typeParam && VALID_TYPES.has(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined;

  let accountFilterLabel: string | null = null;
  if (accountId) {
    try {
      const account = await getAccountWithCookie(spaceId, accountId, cookieHeader);
      accountFilterLabel = account.name;
    } catch (error) {
      rethrowUnlessSpaceFound(error);
    }
  }

  const [transactions, accounts, members] = await Promise.all([
    listTransactionsWithCookie(spaceId, cookieHeader, {
      type,
      accountId,
      limit: 100,
    }),
    listAccountsWithCookie(spaceId, cookieHeader),
    space.type === 'SHARED'
      ? listSpaceMembersWithCookie(spaceId, cookieHeader)
      : Promise.resolve([]),
  ]);

  return (
    <section aria-labelledby="transactions-page-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="transactions-page-title" className={styles.title}>
            Historial
          </h1>
          <p className={styles.lead}>
            {space.name}
            {accountFilterLabel ? ` · Cuenta: ${accountFilterLabel}` : ''}
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          {space.type === 'SHARED' ? (
            <>
              <Link href={sharedExpenseHref(spaceId)}>Gasto compartido</Link>
              <Link href={individualExpenseHref(spaceId)}>Gasto individual</Link>
            </>
          ) : null}
          <Link href={`/spaces/${spaceId}/accounts`}>Cuentas</Link>
          <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
        </nav>
      </header>
      <SpaceTransactionsPanel
        spaceId={spaceId}
        transactions={transactions}
        activeType={type}
        accounts={accounts}
        members={members}
      />
    </section>
  );
}
