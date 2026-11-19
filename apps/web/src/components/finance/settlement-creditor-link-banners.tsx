'use client';

import type { Account } from '@/lib/api/finance-types';
import type { Settlement } from '@/lib/api/settlement-types';
import type { SpaceMember } from '@/lib/api/space-types';
import { settlementsNeedingCreditorPersonalLink } from '@/lib/finance/personal-cash-link';
import { LinkSettlementPersonalCashFlowForm } from '@/components/finance/link-settlement-personal-cash-flow-form';
import styles from './finance-forms.module.css';

type SettlementCreditorLinkBannersProps = {
  spaceId: string;
  currentUserId: string;
  settlements: Settlement[];
  members: SpaceMember[];
  personalAccounts: Account[];
};

function memberName(members: SpaceMember[], userId: string): string {
  return members.find((row) => row.userId === userId)?.displayName ?? userId;
}

export function SettlementCreditorLinkBanners({
  spaceId,
  currentUserId,
  settlements,
  members,
  personalAccounts,
}: SettlementCreditorLinkBannersProps) {
  const pending = settlementsNeedingCreditorPersonalLink(settlements, currentUserId);
  if (pending.length === 0) {
    return null;
  }

  return (
    <aside className={styles.metaBox} aria-labelledby="creditor-cash-link-banner-title">
      <h2 id="creditor-cash-link-banner-title" className={styles.sectionTitle}>
        Anotar cobros en tu cuenta personal
      </h2>
      <p className={styles.meta}>
        Wealthspace no verifica el pago real. Si confirmas que has cobrado, puedes sumar el importe
        a una cuenta de tu espacio personal.
      </p>
      <ul className={styles.list}>
        {pending.map((row) => (
          <li key={row.id} className={styles.listItem}>
            <LinkSettlementPersonalCashFlowForm
              spaceId={spaceId}
              settlement={row}
              personalAccounts={personalAccounts}
              currentUserId={currentUserId}
              counterpartyName={memberName(members, row.fromUserId)}
              variant="banner"
            />
          </li>
        ))}
      </ul>
    </aside>
  );
}