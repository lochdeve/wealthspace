'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSpaceBalances } from '@/lib/api/balances';
import { removeMember } from '@/lib/api/memberships';
import { appendNonZeroNetBalanceNotice } from '@/lib/spaces/member-balance-warning';
import type { MembershipRole, SpaceMember } from '@/lib/api/space-types';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';
import { canRemoveMember, membershipRoleLabel } from '@/lib/spaces/labels';
import { Button } from '@/components/ui/button';
import styles from './spaces-forms.module.css';

type SpaceMembersPanelProps = {
  spaceId: string;
  members: SpaceMember[];
  currentUserId: string;
  actorRole: MembershipRole;
};

export function SpaceMembersPanel({
  spaceId,
  members,
  currentUserId,
  actorRole,
}: SpaceMembersPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  async function handleRemove(member: SpaceMember) {
    let confirmMessage = `¿Expulsar a ${member.displayName} (${member.email}) del espacio?`;
    try {
      const balances = await getSpaceBalances(spaceId);
      confirmMessage = appendNonZeroNetBalanceNotice(
        confirmMessage,
        balances,
        member.userId,
        'third',
      );
    } catch {
      // Informative only (P-19).
    }

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    setError(null);
    setPendingUserId(member.userId);
    try {
      await removeMember(spaceId, member.userId);
      router.refresh();
    } catch (err) {
      setError(membershipActionErrorMessage(err));
    } finally {
      setPendingUserId(null);
    }
  }

  const canManageRemovals = actorRole === 'OWNER' || actorRole === 'ADMIN';

  return (
    <section aria-label="Miembros del espacio">
      {error ? (
        <p role="alert" className={styles.meta}>
          {error}
        </p>
      ) : null}
      <ul className={styles.list}>
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const showRemove =
            canManageRemovals &&
            canRemoveMember(actorRole, member.role, currentUserId, member.userId);

          return (
            <li key={member.userId} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <strong>
                  {member.displayName}
                  {isSelf ? ' (tú)' : ''}
                </strong>
                <span className={styles.meta}>{membershipRoleLabel(member.role)}</span>
              </div>
              <p className={styles.meta}>{member.email}</p>
              <p className={styles.meta}>Desde: {new Date(member.joinedAt).toLocaleString('es')}</p>
              {showRemove ? (
                <div className={styles.inlineActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pendingUserId === member.userId}
                    onClick={() => void handleRemove(member)}
                  >
                    {pendingUserId === member.userId ? 'Expulsando…' : 'Expulsar'}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
