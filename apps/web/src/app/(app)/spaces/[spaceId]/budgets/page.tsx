import Link from 'next/link';
import { BudgetList } from '@/components/budgets/budget-list';
import { CreateBudgetForm } from '@/components/budgets/create-budget-form';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import { listBudgetsWithCookie } from '@/lib/api/budgets';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { consumptionReportHref } from '@/lib/finance/routes';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function SpaceBudgetsPage({ params }: PageProps) {
  await requireUser();
  const { spaceId } = await params;
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  let space;
  try {
    space = await getSpaceWithCookie(spaceId, cookieHeader);
  } catch (error) {
    rethrowUnlessSpaceFound(error);
  }

  const [budgets, categories] = await Promise.all([
    listBudgetsWithCookie(spaceId, cookieHeader),
    listCategoriesWithCookie(spaceId, cookieHeader, 'EXPENSE'),
  ]);

  const defaultCurrency = space.displayCurrency ?? 'EUR';

  return (
    <section aria-labelledby="budgets-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="budgets-title" className={styles.title}>
            Presupuestos
          </h1>
          <p className={styles.lead}>
            Una moneda por presupuesto, sin conversión. Compara con el{' '}
            <Link href={consumptionReportHref(spaceId)}>informe de consumo</Link>.
          </p>
        </div>
      </header>

      <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />

      <div className={styles.stack}>
        <CreateBudgetForm
          spaceId={spaceId}
          defaultCurrency={defaultCurrency}
          expenseCategories={categories}
        />
        <div>
          <h2 className={styles.sectionHeading}>Listado</h2>
          <BudgetList spaceId={spaceId} budgets={budgets} categories={categories} />
        </div>
      </div>
    </section>
  );
}