import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { getAccountWithCookie, listAccountsWithCookie } from '@/lib/api/accounts';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { CreateContributionForm } from '@/components/finance/create-contribution-form';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string; accountId: string }>;
};

export default async function ContributeToAccountPage({ params }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId, accountId } = await params;
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
    redirect(`/spaces/${spaceId}/accounts/${accountId}`);
  }

  let account;
  try {
    account = await getAccountWithCookie(spaceId, accountId, cookieHeader);
  } catch (error) {
    rethrowUnlessSpaceFound(error);
  }

  if (account.archivedAt) {
    redirect(`/spaces/${spaceId}/accounts/${accountId}`);
  }

  const personalAccounts = await listAccountsWithCookie(user.personalSpaceId, cookieHeader);

  return (
    <article aria-labelledby="contribute-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="contribute-title" className={styles.title}>
            Aportar a cuenta común
          </h1>
          <p className={styles.lead}>
            {account.name} · {space.name}
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={`/spaces/${spaceId}/accounts/${accountId}`}>← Cuenta</Link>
        </nav>
      </header>
      <CreateContributionForm
        spaceId={spaceId}
        sharedAccount={account}
        currentUserId={user.id}
        personalAccounts={personalAccounts}
      />
    </article>
  );
}