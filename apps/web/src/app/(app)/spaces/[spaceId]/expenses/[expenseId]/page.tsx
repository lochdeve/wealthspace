import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { getSharedExpenseWithCookie } from '@/lib/api/shared-expenses';
import { SharedExpenseDetailPanel } from '@/components/finance/shared-expense-detail-panel';
import { sharedExpensesHref } from '@/lib/finance/routes';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string; expenseId: string }>;
};

export default async function SharedExpenseDetailPage({ params }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId, expenseId } = await params;
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

  let expense;
  try {
    expense = await getSharedExpenseWithCookie(spaceId, expenseId, cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  const [members, accounts] = await Promise.all([
    listSpaceMembersWithCookie(spaceId, cookieHeader),
    listAccountsWithCookie(spaceId, cookieHeader),
  ]);

  return (
    <article aria-labelledby="shared-expense-detail-page-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="shared-expense-detail-page-title" className={styles.title}>
            Detalle del gasto
          </h1>
          <p className={styles.lead}>{space.name}</p>
        </div>
        <Link href={sharedExpensesHref(spaceId, { includeVoided: Boolean(expense.voidedAt) })}>
          ← Gastos compartidos
        </Link>
      </header>
      <SharedExpenseDetailPanel
        expense={expense}
        viewerUserId={user.id}
        members={members}
        accounts={accounts}
      />
    </article>
  );
}