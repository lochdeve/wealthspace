import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import {
  getSharedExpenseWithCookie,
  listSharedExpenseRevisionsWithCookie,
} from '@/lib/api/shared-expenses';
import { CreateSharedExpenseForm } from '@/components/finance/create-shared-expense-form';
import { SharedExpenseDetailPanel } from '@/components/finance/shared-expense-detail-panel';
import { SharedExpenseRevisionsPanel } from '@/components/finance/shared-expense-revisions-panel';
import { VoidSharedExpenseForm } from '@/components/finance/void-shared-expense-form';
import { canMutateSharedExpense } from '@/lib/finance/shared-expense-permissions';
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

  const [members, accounts, categories, revisions] = await Promise.all([
    listSpaceMembersWithCookie(spaceId, cookieHeader),
    listAccountsWithCookie(spaceId, cookieHeader),
    listCategoriesWithCookie(spaceId, cookieHeader, 'EXPENSE'),
    listSharedExpenseRevisionsWithCookie(spaceId, expenseId, cookieHeader),
  ]);

  const canMutate = canMutateSharedExpense(space.role, user.id, expense);

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
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          {canMutate && !expense.voidedAt ? (
            <Link href="#edit-shared-expense">Editar</Link>
          ) : null}
          <Link href={sharedExpensesHref(spaceId, { includeVoided: Boolean(expense.voidedAt) })}>
            ← Gastos compartidos
          </Link>
        </nav>
      </header>
      <SharedExpenseDetailPanel
        expense={expense}
        viewerUserId={user.id}
        members={members}
        accounts={accounts}
      />
      {canMutate && !expense.voidedAt ? (
        <>
          <section className={styles.section} aria-labelledby="edit-shared-expense-heading">
            <h2 id="edit-shared-expense-heading" className={styles.sectionHeading}>
              Editar gasto compartido
            </h2>
            <CreateSharedExpenseForm
              spaceId={spaceId}
              currentUserId={user.id}
              actorRole={space.role}
              members={members}
              accounts={accounts}
              categories={categories}
              displayCurrency={space.displayCurrency}
              edit={{ expenseId, expense }}
            />
          </section>
          <VoidSharedExpenseForm
            spaceId={spaceId}
            expenseId={expenseId}
            expectedVersion={expense.version}
          />
        </>
      ) : null}
      <SharedExpenseRevisionsPanel revisions={revisions} members={members} />
    </article>
  );
}