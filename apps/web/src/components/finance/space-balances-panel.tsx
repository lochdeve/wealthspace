import Link from 'next/link';
import type { SpaceBalances } from '@/lib/api/balance-types';
import type { MembershipRole, SpaceMember } from '@/lib/api/space-types';
import {
  debtLine,
  memberNetSummary,
  viewerAffectedByDebt,
} from '@/lib/finance/balance-view';
import { registerSettlementHref } from '@/lib/finance/routes';
import { canRegisterSettlement } from '@/lib/finance/settlement-permissions';
import styles from './finance-forms.module.css';

const PAYMENT_DISCLAIMER =
  'Wealthspace no realiza ni verifica pagos. Una liquidación es una anotación de buena fe.';

type SpaceBalancesPanelProps = {
  spaceId: string;
  balances: SpaceBalances;
  members: SpaceMember[];
  viewerUserId: string;
  actorRole: MembershipRole;
};

function memberName(members: SpaceMember[], userId: string): string {
  return members.find((row) => row.userId === userId)?.displayName ?? userId;
}

export function SpaceBalancesPanel({
  spaceId,
  balances,
  members,
  viewerUserId,
  actorRole,
}: SpaceBalancesPanelProps) {
  if (balances.currencies.length === 0) {
    return (
      <section aria-labelledby="space-balances-title">
        <h2 id="space-balances-title" className={styles.sectionTitle}>
          Saldos entre miembros
        </h2>
        <p className={styles.meta}>No hay deudas pendientes en este espacio.</p>
        <p className={styles.meta}>{PAYMENT_DISCLAIMER}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="space-balances-title">
      <h2 id="space-balances-title" className={styles.sectionTitle}>
        Saldos entre miembros
      </h2>
      <p className={styles.meta}>{PAYMENT_DISCLAIMER}</p>
      {balances.currencies.map((bucket) => (
        <div key={bucket.currency} className={styles.metaBox}>
          <h3 className={styles.legend}>Moneda {bucket.currency}</h3>
          {bucket.debts.length === 0 ? (
            <p className={styles.meta}>Sin deudas directas en esta moneda.</p>
          ) : (
            <ul className={styles.list}>
              {bucket.debts.map((debt) => {
                const highlight = viewerAffectedByDebt(
                  viewerUserId,
                  debt.fromUserId,
                  debt.toUserId,
                );
                const fromName = memberName(members, debt.fromUserId);
                const toName = memberName(members, debt.toUserId);
                const canRegister = canRegisterSettlement(
                  actorRole,
                  viewerUserId,
                  debt.fromUserId,
                  debt.toUserId,
                );
                return (
                  <li
                    key={`${debt.fromUserId}-${debt.toUserId}`}
                    className={styles.listItem}
                    style={highlight ? { fontWeight: 600 } : undefined}
                    aria-current={highlight ? 'true' : undefined}
                  >
                    <div className={styles.listItemHeader}>
                      <span>{debtLine(fromName, toName, debt.amount, bucket.currency)}</span>
                    </div>
                    {canRegister ? (
                      <p>
                        <Link
                          href={registerSettlementHref(spaceId, {
                            fromUserId: debt.fromUserId,
                            toUserId: debt.toUserId,
                            amount: debt.amount,
                            currency: bucket.currency,
                          })}
                        >
                          Registrar pago
                        </Link>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {bucket.members.length > 0 ? (
            <>
              <p className={styles.legend}>Saldo neto por miembro</p>
              <ul className={styles.list}>
                {bucket.members.map((row) => {
                  const highlight = row.userId === viewerUserId;
                  return (
                    <li
                      key={row.userId}
                      className={styles.listItem}
                      style={highlight ? { fontWeight: 600 } : undefined}
                    >
                      <div className={styles.listItemHeader}>
                        <span>{memberName(members, row.userId)}</span>
                        <span>{memberNetSummary(row.net, bucket.currency)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ))}
    </section>
  );
}