import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listSettlementsWithCookie } from '@/lib/api/settlements';
import { SettlementsListPanel } from '@/components/finance/settlements-list-panel';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { registerSettlementHref, spaceBalancesHref } from '@/lib/finance/routes';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ includeVoided?: string; warning?: string }>;
};

export default async function SettlementsPage({ params, searchParams }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId } = await params;
  const { includeVoided: includeVoidedParam, warning } = await searchParams;
  const includeVoided = includeVoidedParam === '1' || includeVoidedParam === 'true';
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader || !user) {
    return null;
  }

  let space;
  try {
    space = await getSpaceWithCookie(spaceId, cookieHeader);
  } catch (error) {
    rethrowUnlessSpaceFound(error);
  }

  if (space.type !== 'SHARED') {
    redirect(`/spaces/${spaceId}/accounts`);
  }

  const [settlements, members] = await Promise.all([
    listSettlementsWithCookie(spaceId, cookieHeader, { includeVoided, limit: 100 }),
    listSpaceMembersWithCookie(spaceId, cookieHeader),
  ]);

  return (
    <section aria-labelledby="settlements-page-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="settlements-page-title" className={styles.title}>
            Liquidaciones
          </h1>
          <p className={styles.lead}>{space.name}</p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={registerSettlementHref(spaceId)}>Registrar pago</Link>
          <Link href={spaceBalancesHref(spaceId)}>Saldos</Link>
          <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
        </nav>
      </header>
      <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />
      <SettlementsListPanel
        spaceId={spaceId}
        settlements={settlements}
        members={members}
        viewerUserId={user.id}
        actorRole={space.role}
        includeVoided={includeVoided}
        warningCode={warning}
      />
    </section>
  );
}