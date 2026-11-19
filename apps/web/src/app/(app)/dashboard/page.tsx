import Link from 'next/link';
import { ConsumptionReportSummary } from '@/components/reports/consumption-report-summary';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { getConsumptionReportWithCookie } from '@/lib/api/reports';
import { listSpacesWithCookie } from '@/lib/api/spaces';
import { consumptionReportHref, spaceBudgetsHref } from '@/lib/finance/routes';
import { spaceTypeLabel } from '@/lib/spaces/labels';
import { currentYearMonthInTimezone } from '@/lib/reports/report-month';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import styles from '@/app/(app)/app-pages.module.css';
import dash from './dashboard.module.css';

export default async function DashboardPage() {
  const user = await requireUser('/dashboard');
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  const { year, month } = currentYearMonthInTimezone(user.timezone);

  const [spaces, personalReport, personalCategories] = await Promise.all([
    listSpacesWithCookie(cookieHeader),
    getConsumptionReportWithCookie(user.personalSpaceId, year, month, cookieHeader),
    listCategoriesWithCookie(user.personalSpaceId, cookieHeader, 'EXPENSE'),
  ]);

  return (
    <section aria-labelledby="dashboard-title">
      <header className={styles.pageHeader}>
        <div>
          <h1 id="dashboard-title" className={styles.title}>
            Panel
          </h1>
          <p className={styles.lead}>
            Hola, {user.displayName}. Resumen del mes en {user.timezone}.
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href="/settings">Ajustes</Link>
        </nav>
      </header>

      <div className={styles.stack}>
        <section aria-labelledby="personal-consumption">
          <h2 id="personal-consumption" className={styles.sectionHeading}>
            Consumo personal (este mes)
          </h2>
          <ConsumptionReportSummary
            report={personalReport}
            categories={personalCategories}
            compact
          />
          <p>
            <Link href={consumptionReportHref(user.personalSpaceId, { year, month })}>
              Ver informe completo
            </Link>
            {' · '}
            <Link href={spaceBudgetsHref(user.personalSpaceId)}>Presupuestos personales</Link>
          </p>
        </section>

        <section aria-labelledby="spaces-reports">
          <h2 id="spaces-reports" className={styles.sectionHeading}>
            Por espacio
          </h2>
          <ul className={styles.spaceGrid}>
            {spaces.map((space) => (
              <li key={space.id} className={styles.spaceCard}>
                <Link href={`/spaces/${space.id}`}>{space.name}</Link>
                <span className={styles.badge}>{spaceTypeLabel(space.type)}</span>
                <p className={styles.lead}>
                  <Link href={consumptionReportHref(space.id, { year, month })}>
                    Informe de consumo
                  </Link>
                  {' · '}
                  <Link href={spaceBudgetsHref(space.id)}>Presupuestos</Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <dl className={dash.card} aria-label="Perfil">
        <div className={dash.row}>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
        </div>
        <div className={dash.row}>
          <dt>Zona horaria</dt>
          <dd className={dash.code}>{user.timezone}</dd>
        </div>
      </dl>
    </section>
  );
}
