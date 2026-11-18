import Link from 'next/link';
import { ConsumptionMonthForm } from '@/components/reports/consumption-month-form';
import { ConsumptionReportSummary } from '@/components/reports/consumption-report-summary';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { getConsumptionReportWithCookie } from '@/lib/api/reports';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { spaceBudgetsHref } from '@/lib/finance/routes';
import {
  currentYearMonthInTimezone,
  parseReportMonthQuery,
} from '@/lib/reports/report-month';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function ConsumptionReportPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { spaceId } = await params;
  const query = await searchParams;
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

  const fallback = currentYearMonthInTimezone(user.timezone);
  const { year, month } = parseReportMonthQuery(query.year, query.month, fallback);

  const [report, categories] = await Promise.all([
    getConsumptionReportWithCookie(spaceId, year, month, cookieHeader),
    listCategoriesWithCookie(spaceId, cookieHeader, 'EXPENSE'),
  ]);

  return (
    <section aria-labelledby="consumption-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="consumption-title" className={styles.title}>
            Informe de consumo
          </h1>
          <p className={styles.lead}>
            Mes calendario en tu zona horaria ({user.timezone}).{' '}
            <Link href={spaceBudgetsHref(spaceId)}>Presupuestos del espacio</Link>.
          </p>
        </div>
      </header>

      <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />

      <ConsumptionMonthForm spaceId={spaceId} year={year} month={month} />

      <ConsumptionReportSummary report={report} categories={categories} />
    </section>
  );
}