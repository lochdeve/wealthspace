import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { getSpaceBalancesWithCookie } from '@/lib/api/balances';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { SpaceBalancesPanel } from '@/components/finance/space-balances-panel';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { registerSettlementHref, settlementsHref } from '@/lib/finance/routes';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function SpaceBalancesPage({ params }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId } = await params;
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader || !user) {
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

  const [balances, members] = await Promise.all([
    getSpaceBalancesWithCookie(spaceId, cookieHeader),
    listSpaceMembersWithCookie(spaceId, cookieHeader),
  ]);

  return (
    <section aria-labelledby="balances-page-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="balances-page-title" className={styles.title}>
            Saldos
          </h1>
          <p className={styles.lead}>{space.name}</p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={registerSettlementHref(spaceId)}>Registrar pago</Link>
          <Link href={settlementsHref(spaceId)}>Liquidaciones</Link>
          <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
        </nav>
      </header>
      <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />
      <SpaceBalancesPanel
        spaceId={spaceId}
        balances={balances}
        members={members}
        viewerUserId={user.id}
        actorRole={space.role}
      />
    </section>
  );
}