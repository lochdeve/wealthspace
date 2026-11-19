import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { RegisterSettlementForm } from '@/components/finance/register-settlement-form';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { settlementsHref, spaceBalancesHref } from '@/lib/finance/routes';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{
    fromUserId?: string;
    toUserId?: string;
    amount?: string;
    currency?: string;
  }>;
};

export default async function NewSettlementPage({ params, searchParams }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId } = await params;
  const query = await searchParams;
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

  const [members, personalAccounts] = await Promise.all([
    listSpaceMembersWithCookie(spaceId, cookieHeader),
    listAccountsWithCookie(user.personalSpaceId, cookieHeader),
  ]);

  return (
    <article aria-labelledby="new-settlement-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="new-settlement-title" className={styles.title}>
            Registrar pago
          </h1>
          <p className={styles.lead}>
            Liquidación entre miembros. Wealthspace no realiza ni verifica pagos.
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={spaceBalancesHref(spaceId)}>Saldos</Link>
          <Link href={settlementsHref(spaceId)}>Liquidaciones</Link>
        </nav>
      </header>
      <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />
      <RegisterSettlementForm
        spaceId={spaceId}
        currentUserId={user.id}
        actorRole={space.role}
        members={members}
        personalAccounts={personalAccounts}
        defaultFromUserId={query.fromUserId}
        defaultToUserId={query.toUserId}
        defaultAmount={query.amount}
        defaultCurrency={query.currency ?? space.displayCurrency ?? 'EUR'}
      />
    </article>
  );
}