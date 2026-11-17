import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listSharedExpensesWithCookie } from '@/lib/api/shared-expenses';
import { SharedExpensesListPanel } from '@/components/finance/shared-expenses-list-panel';
import { individualExpenseHref, sharedExpenseHref } from '@/lib/finance/routes';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ includeVoided?: string }>;
};

export default async function SharedExpensesPage({ params, searchParams }: PageProps) {
  await requireUser();
  const { spaceId } = await params;
  const { includeVoided: includeVoidedParam } = await searchParams;
  const includeVoided = includeVoidedParam === '1' || includeVoidedParam === 'true';
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

  if (space.type !== 'SHARED') {
    redirect(`/spaces/${spaceId}/accounts`);
  }

  const expenses = await listSharedExpensesWithCookie(spaceId, cookieHeader, {
    includeVoided,
    limit: 100,
  });

  return (
    <section aria-labelledby="shared-expenses-page-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="shared-expenses-page-title" className={styles.title}>
            Gastos compartidos
          </h1>
          <p className={styles.lead}>{space.name}</p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={sharedExpenseHref(spaceId)}>Registrar gasto</Link>
          <Link href={individualExpenseHref(spaceId)}>Gasto individual</Link>
          <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
        </nav>
      </header>
      <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />
      <SharedExpensesListPanel
        spaceId={spaceId}
        expenses={expenses}
        includeVoided={includeVoided}
      />
    </section>
  );
}