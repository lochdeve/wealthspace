import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { RecordSharedExpenseForm } from '@/components/finance/record-shared-expense-form';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function NewSharedExpensePage({ params }: PageProps) {
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

  const [members, accounts, categories] = await Promise.all([
    listSpaceMembersWithCookie(spaceId, cookieHeader),
    listAccountsWithCookie(spaceId, cookieHeader),
    listCategoriesWithCookie(spaceId, cookieHeader, 'EXPENSE'),
  ]);

  return (
    <article aria-labelledby="shared-expense-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="shared-expense-title" className={styles.title}>
            Gasto compartido
          </h1>
          <p className={styles.lead}>
            Atribución obligatoria. La cuenta es opcional; sin cuenta no mueve saldo.
          </p>
        </div>
        <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
      </header>
      <RecordSharedExpenseForm
        spaceId={spaceId}
        currentUserId={user.id}
        actorRole={space.role}
        members={members}
        accounts={accounts}
        categories={categories}
        displayCurrency={space.displayCurrency}
      />
    </article>
  );
}
