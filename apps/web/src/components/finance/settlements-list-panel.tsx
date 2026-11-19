'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import type { Settlement } from '@/lib/api/settlement-types';
import type { MembershipRole, SpaceMember } from '@/lib/api/space-types';
import { voidSettlement } from '@/lib/api/settlements';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { registerSettlementHref, settlementsHref } from '@/lib/finance/routes';
import {
  settlementActionErrorMessage,
  settlementWarningMessage,
} from '@/lib/finance/settlement-messages';
import type { Account } from '@/lib/api/finance-types';
import { settlementNeedsPersonalCashLink } from '@/lib/finance/personal-cash-link';
import { canVoidSettlement } from '@/lib/finance/settlement-permissions';
import { LinkSettlementPersonalCashFlowForm } from '@/components/finance/link-settlement-personal-cash-flow-form';
import { SettlementCreditorLinkBanners } from '@/components/finance/settlement-creditor-link-banners';
import { Button } from '@/components/ui/button';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type SettlementsListPanelProps = {
  spaceId: string;
  settlements: Settlement[];
  members: SpaceMember[];
  viewerUserId: string;
  actorRole: MembershipRole;
  includeVoided: boolean;
  warningCode?: string;
  personalAccounts?: Account[];
};

function memberName(members: SpaceMember[], userId: string): string {
  return members.find((row) => row.userId === userId)?.displayName ?? userId;
}

export function SettlementsListPanel({
  spaceId,
  settlements,
  members,
  viewerUserId,
  actorRole,
  includeVoided,
  warningCode,
  personalAccounts = [],
}: SettlementsListPanelProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  async function handleVoid(settlement: Settlement) {
    setPanelError(null);
    const accepted = window.confirm(
      '¿Anular esta liquidación? La deuda pendiente volverá a reflejar este importe.',
    );
    if (!accepted) {
      return;
    }

    setPendingId(settlement.id);
    try {
      await voidSettlement(spaceId, settlement.id, { expectedVersion: settlement.version });
      router.refresh();
    } catch (error) {
      const message = settlementActionErrorMessage(error);
      if (error instanceof ApiError && (error.code === 'VERSION_CONFLICT' || error.code === 'ALREADY_VOIDED')) {
        router.refresh();
      }
      setPanelError(message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="settlements-list-title">
      <h2 id="settlements-list-title" className={styles.sectionTitle}>
        Liquidaciones
      </h2>
      <p className={styles.meta}>Wealthspace no realiza ni verifica pagos.</p>
      {warningCode ? (
        <p className={ui.alert} role="status">
          {settlementWarningMessage(warningCode)}
        </p>
      ) : null}
      <SettlementCreditorLinkBanners
        spaceId={spaceId}
        currentUserId={viewerUserId}
        settlements={settlements}
        members={members}
        personalAccounts={personalAccounts}
      />
      <nav className={styles.inlineActions} aria-label="Filtros">
        <Link
          href={settlementsHref(spaceId)}
          aria-current={includeVoided ? undefined : 'page'}
          style={{ fontWeight: includeVoided ? undefined : 600 }}
        >
          Activas
        </Link>
        <Link
          href={settlementsHref(spaceId, { includeVoided: true })}
          aria-current={includeVoided ? 'page' : undefined}
          style={{ fontWeight: includeVoided ? 600 : undefined }}
        >
          Incluir anuladas
        </Link>
        <Link href={registerSettlementHref(spaceId)}>Registrar pago</Link>
      </nav>
      {panelError ? (
        <p className={ui.alert} role="alert">
          {panelError}
        </p>
      ) : null}
      {settlements.length === 0 ? (
        <p className={styles.meta}>No hay liquidaciones con este filtro.</p>
      ) : (
        <ul className={styles.list}>
          {settlements.map((row) => {
            const fromName = memberName(members, row.fromUserId);
            const toName = memberName(members, row.toUserId);
            const voided = Boolean(row.voidedAt);
            const canVoid = !voided && canVoidSettlement(actorRole, viewerUserId, row);
            const showPersonalLink =
              !voided &&
              personalAccounts.length > 0 &&
              settlementNeedsPersonalCashLink(row, viewerUserId);
            return (
              <li key={row.id} className={styles.listItem}>
                <div className={styles.listItemHeader}>
                  <strong>
                    Pago: {fromName} → {toName}
                  </strong>
                  <span>{formatMoneyAmount(row.amount, row.currency)}</span>
                </div>
                <p className={styles.meta}>{new Date(row.occurredAt).toLocaleString('es')}</p>
                {voided ? (
                  <p className={styles.meta}>
                    <strong>Anulada</strong>
                    {row.voidedAt ? ` · ${new Date(row.voidedAt).toLocaleString('es')}` : ''}
                  </p>
                ) : null}
                {row.myPersonalCashLink?.linked ? (
                  <p className={styles.meta} role="status">
                    Tu movimiento personal está vinculado a esta liquidación.
                  </p>
                ) : null}
                {showPersonalLink ? (
                  <LinkSettlementPersonalCashFlowForm
                    spaceId={spaceId}
                    settlement={row}
                    personalAccounts={personalAccounts}
                    currentUserId={viewerUserId}
                    counterpartyName={
                      viewerUserId === row.toUserId ? fromName : toName
                    }
                  />
                ) : null}
                {canVoid ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pendingId === row.id}
                    onClick={() => void handleVoid(row)}
                  >
                    {pendingId === row.id ? 'Anulando…' : 'Anular liquidación'}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}