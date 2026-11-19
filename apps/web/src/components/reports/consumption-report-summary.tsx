import type { Category } from '@/lib/api/finance-types';
import type { ConsumptionReport } from '@/lib/api/report-types';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { monthLabel } from '@/lib/reports/report-month';
import styles from '@/app/(app)/app-pages.module.css';
import dash from '@/app/(app)/dashboard/dashboard.module.css';

type ConsumptionReportSummaryProps = {
  report: ConsumptionReport;
  categories: Category[];
  compact?: boolean;
};

function categoryLabel(categories: Category[], categoryId?: string): string {
  if (categoryId === undefined) {
    return 'Sin categoría';
  }
  return categories.find((category) => category.id === categoryId)?.name ?? 'Categoría desconocida';
}

export function ConsumptionReportSummary({
  report,
  categories,
  compact = false,
}: ConsumptionReportSummaryProps) {
  const title = monthLabel(report.year, report.month);

  return (
    <section aria-labelledby={compact ? undefined : 'consumption-report-title'}>
      {!compact ? (
        <header className={styles.pageHeader}>
          <div>
            <h2 id="consumption-report-title" className={styles.sectionHeading}>
              {title}
            </h2>
            <p className={styles.lead}>
              Periodo local {report.periodStartLocal} — {report.periodEndLocal} ({report.timezone}).
              Solo consumo (P-17); sin flujo de caja entre espacios.
            </p>
          </div>
        </header>
      ) : (
        <h3 className={styles.sectionHeading}>{title}</h3>
      )}

      {report.totalsByCurrency.length === 0 ? (
        <p className={styles.lead}>Sin consumo registrado en este mes.</p>
      ) : (
        <dl className={dash.card}>
          <p className={styles.lead}>Total</p>
          {report.totalsByCurrency.map((row) => (
            <div key={row.currency} className={dash.row}>
              <dt>{row.currency}</dt>
              <dd>{formatMoneyAmount(row.amount, row.currency)}</dd>
            </div>
          ))}
        </dl>
      )}

      {report.byCategory.length > 0 ? (
        <div>
          <h3 className={styles.sectionHeading}>Por categoría</h3>
          <ul className={styles.spaceGrid}>
            {report.byCategory.map((row) => (
              <li key={`${row.categoryId ?? 'none'}-${row.currency}`} className={styles.spaceCard}>
                <span>{categoryLabel(categories, row.categoryId)}</span>
                <strong>{formatMoneyAmount(row.amount, row.currency)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
