'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { acceptInvitation, rejectInvitation } from '@/lib/api/invitations';
import { ApiError } from '@/lib/api/errors';
import type { Invitation, SpaceListItem } from '@/lib/api/space-types';
import { membershipRoleLabel } from '@/lib/spaces/labels';
import { Button } from '@/components/ui/button';
import styles from '@/components/spaces/spaces-forms.module.css';

type PendingInvitationsListProps = {
  invitations: Invitation[];
  spacesById: Record<string, SpaceListItem>;
};

export function PendingInvitationsList({ invitations, spacesById }: PendingInvitationsListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);

  async function runAction(invitationId: string, kind: 'accept' | 'reject') {
    setError(null);
    setPendingId(invitationId);
    setAction(kind);
    try {
      if (kind === 'accept') {
        await acceptInvitation(invitationId);
      } else {
        await rejectInvitation(invitationId);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la invitación.');
    } finally {
      setPendingId(null);
      setAction(null);
    }
  }

  if (invitations.length === 0) {
    return <p className={styles.meta}>No tienes invitaciones pendientes.</p>;
  }

  return (
    <div>
      {error ? (
        <p role="alert" className={styles.meta}>
          {error}
        </p>
      ) : null}
      <ul className={styles.list}>
        {invitations.map((invitation) => {
          const space = spacesById[invitation.spaceId];
          const spaceName = invitation.spaceName ?? space?.name ?? 'Espacio compartido';
          const inviterName = invitation.invitedByDisplayName;
          const busy = pendingId === invitation.id;
          return (
            <li key={invitation.id} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <strong>{spaceName}</strong>
                <span className={styles.meta}>{membershipRoleLabel(invitation.role)}</span>
              </div>
              {inviterName ? <p className={styles.meta}>Te invita: {inviterName}</p> : null}
              <div className={styles.inlineActions}>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction(invitation.id, 'accept')}
                >
                  {busy && action === 'accept' ? 'Aceptando…' : 'Aceptar'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runAction(invitation.id, 'reject')}
                >
                  {busy && action === 'reject' ? 'Rechazando…' : 'Rechazar'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
