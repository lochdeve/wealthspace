import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import type { TransactionType } from '@/lib/api/finance-types';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listTransactionsWithCookie } from '@/lib/api/transactions';
import { SpaceTransactionsPanel } from '@/components/finance/space-transactions-panel';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

const VALID_TYPES = new Set<TransactionType>(['INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_BALANCE']);

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function SpaceTransactionsPage({ params, searchParams }: PageProps) {
  await requireUser();
  const { spaceId } = await params;
  const { type: typeParam } = await searchParams;
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

  const type =
    typeParam && VALID_TYPES.has(typeParam as TransactionType)
      ? (typeParam as TransactionType)
      : undefined;

  const transactions = await listTransactionsWithCookie(spaceId, cookieHeader, {
    type,
    limit: 100,
  });

  return (
    <section aria-labelledby="transactions-page-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="transactions-page-title" className={styles.title}>
            Historial
          </h1>
          <p className={styles.lead}>{space.name}</p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={`/spaces/${spaceId}/accounts`}>Cuentas</Link>
          <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
        </nav>
      </header>
      <SpaceTransactionsPanel spaceId={spaceId} transactions={transactions} activeType={type} />
    </section>
  );
}
