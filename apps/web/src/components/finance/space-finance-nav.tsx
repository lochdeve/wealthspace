import Link from 'next/link';
import type { SpaceType } from '@/lib/api/space-types';
import {
  consumptionReportHref,
  individualExpenseHref,
  sharedExpenseHref,
  sharedExpensesHref,
  settlementsHref,
  spaceBalancesHref,
  spaceBudgetsHref,
} from '@/lib/finance/routes';
import styles from '@/app/(app)/app-pages.module.css';

type SpaceFinanceNavProps = {
  spaceId: string;
  spaceType: SpaceType;
};

export function SpaceFinanceNav({ spaceId, spaceType }: SpaceFinanceNavProps) {
  return (
    <nav className={styles.nav} aria-label="Finanzas del espacio">
      <Link href={`/spaces/${spaceId}/accounts`}>Cuentas</Link>
      <Link href={`/spaces/${spaceId}/transactions`}>Movimientos</Link>
      <Link href={`/spaces/${spaceId}/categories`}>Categorías</Link>
      <Link href={spaceBudgetsHref(spaceId)}>Presupuestos</Link>
      <Link href={consumptionReportHref(spaceId)}>Consumo</Link>
      {spaceType === 'SHARED' ? (
        <>
          <Link href={sharedExpensesHref(spaceId)}>Gastos compartidos</Link>
          <Link href={sharedExpenseHref(spaceId)}>Registrar gasto compartido</Link>
          <Link href={spaceBalancesHref(spaceId)}>Saldos</Link>
          <Link href={settlementsHref(spaceId)}>Liquidaciones</Link>
          <Link href={individualExpenseHref(spaceId)}>Gasto individual</Link>
        </>
      ) : null}
    </nav>
  );
}
