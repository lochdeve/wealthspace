import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { RecordIndividualExpenseForm } from '@/components/finance/record-individual-expense-form';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import { sharedExpenseHref } from '@/lib/finance/routes';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ accountId?: string }>;
};

export default async function NewIndividualExpensePage({ params, searchParams }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId } = await params;
  const { accountId } = await searchParams;
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

  const [members, accounts, categories] = await Promise.all([
    listSpaceMembersWithCookie(spaceId, cookieHeader),
    listAccountsWithCookie(spaceId, cookieHeader),
    listCategoriesWithCookie(spaceId, cookieHeader, 'EXPENSE'),
  ]);

  return (
    <article aria-labelledby="individual-expense-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="individual-expense-title" className={styles.title}>
            Gasto individual
          </h1>
          <p className={styles.lead}>
            Se imputa a una sola persona del espacio: no se reparte ni genera deudas. Con cuenta,
            descuenta su saldo; sin cuenta, no mueve dinero.
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={sharedExpenseHref(spaceId)}>Gasto compartido</Link>
          <Link href={`/spaces/${spaceId}/transactions`}>← Movimientos</Link>
        </nav>
      </header>
      <RecordIndividualExpenseForm
        spaceId={spaceId}
        currentUserId={user.id}
        actorRole={space.role}
        members={members}
        accounts={accounts}
        categories={categories}
        displayCurrency={space.displayCurrency}
        defaultAccountId={accountId}
      />
    </article>
  );
}
