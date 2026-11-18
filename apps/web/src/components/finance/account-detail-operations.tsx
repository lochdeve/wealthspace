import Link from 'next/link';
import type { Account, Category } from '@/lib/api/finance-types';
import type { SpaceType } from '@/lib/api/space-types';
import { individualExpenseHref } from '@/lib/finance/routes';
import { ArchiveAccountButton } from '@/components/finance/archive-account-button';
import { OpeningBalanceForm } from '@/components/finance/opening-balance-form';
import { RecordCashflowForm } from '@/components/finance/record-cashflow-form';
import { RecordTransferForm } from '@/components/finance/record-transfer-form';
import pageStyles from '@/app/(app)/app-pages.module.css';
import financeStyles from './finance-forms.module.css';

type AccountDetailOperationsProps = {
  spaceId: string;
  spaceType: SpaceType;
  account: Account;
  hasOpeningBalance: boolean;
  incomeCategories: Category[];
  expenseCategories: Category[];
  transferTargets: Account[];
};

export function AccountDetailOperations({
  spaceId,
  spaceType,
  account,
  hasOpeningBalance,
  incomeCategories,
  expenseCategories,
  transferTargets,
}: AccountDetailOperationsProps) {
  if (account.archivedAt) {
    return null;
  }

  return (
    <>
      <section className={pageStyles.section} aria-labelledby="account-ops-title">
        <h2 id="account-ops-title" className={pageStyles.sectionHeading}>
          Registrar movimientos
        </h2>
        <div className={pageStyles.stack}>
          <div>
            <h3 className={financeStyles.legend}>Saldo inicial</h3>
            {!hasOpeningBalance ? (
              <OpeningBalanceForm
                spaceId={spaceId}
                accountId={account.id}
                currency={account.currency}
              />
            ) : (
              <p className={financeStyles.meta}>Ya hay un saldo inicial para esta cuenta.</p>
            )}
          </div>
          <div>
            <h3 className={financeStyles.legend}>Ingreso</h3>
            <RecordCashflowForm
              spaceId={spaceId}
              accountId={account.id}
              kind="INCOME"
              categories={incomeCategories}
            />
          </div>
          <div>
            <h3 className={financeStyles.legend}>Gasto</h3>
            {spaceType === 'SHARED' ? (
              <section className={financeStyles.form} aria-labelledby="account-expense-title">
                <p id="account-expense-title" className={financeStyles.meta}>
                  En un espacio compartido, imputa el gasto a una persona con «Gasto individual»; el
                  importe descuenta el saldo de esta cuenta.
                </p>
                <p>
                  <Link href={individualExpenseHref(spaceId, account.id)}>
                    Registrar gasto individual con esta cuenta
                  </Link>
                </p>
              </section>
            ) : (
              <RecordCashflowForm
                spaceId={spaceId}
                accountId={account.id}
                kind="EXPENSE"
                categories={expenseCategories}
              />
            )}
          </div>
          <div>
            <h3 className={financeStyles.legend}>Transferencia</h3>
            <RecordTransferForm
              spaceId={spaceId}
              sourceAccount={account}
              destinationAccounts={transferTargets}
            />
          </div>
        </div>
      </section>

      <aside className={pageStyles.dangerZone} aria-labelledby="account-danger-title">
        <h2 id="account-danger-title" className={pageStyles.dangerZoneTitle}>
          Archivar cuenta
        </h2>
        <p className={pageStyles.dangerZoneLead}>
          La cuenta seguirá visible si la incluyes en el listado de archivadas, pero no admitirá
          nuevos movimientos.
        </p>
        <ArchiveAccountButton spaceId={spaceId} accountId={account.id} accountName={account.name} />
      </aside>
    </>
  );
}