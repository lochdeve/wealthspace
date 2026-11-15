'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { revokeSpaceInvitation } from '@/lib/api/invitations';
import { invitationActionErrorMessage } from '@/lib/spaces/invitation-messages';
import type { Invitation } from '@/lib/api/space-types';
import { membershipRoleLabel } from '@/lib/spaces/labels';
import { Button } from '@/components/ui/button';
import styles from './spaces-forms.module.css';

type SpaceInvitationsPanelProps = {
  spaceId: string;
  invitations: Invitation[];
};

export function SpaceInvitationsPanel({ spaceId, invitations }: SpaceInvitationsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRevoke(invitationId: string) {
    setError(null);
    setPendingId(invitationId);
    try {
      await revokeSpaceInvitation(spaceId, invitationId);
      router.refresh();
    } catch (err) {
      setError(invitationActionErrorMessage(err, 'No se pudo revocar la invitación.'));
    } finally {
      setPendingId(null);
    }
  }

  const pending = invitations.filter((row) => row.status === 'PENDING');

  return (
    <section aria-labelledby="space-invitations-title">
      <h2 id="space-invitations-title" className={styles.sectionTitle}>
        Invitaciones pendientes
      </h2>
      {error ? (
        <p role="alert" className={styles.meta}>
          {error}
        </p>
      ) : null}
      {pending.length === 0 ? (
        <p className={styles.meta}>No hay invitaciones pendientes.</p>
      ) : (
        <ul className={styles.list}>
          {pending.map((invitation) => (
            <li key={invitation.id} className={styles.listItem}>
              <div className={styles.listItemHeader}>
                <strong>{invitation.email}</strong>
                <span className={styles.meta}>{membershipRoleLabel(invitation.role)}</span>
              </div>
              {invitation.expiresAt ? (
                <p className={styles.meta}>
                  Caduca: {new Date(invitation.expiresAt).toLocaleString('es')}
                </p>
              ) : null}
              <div className={styles.inlineActions}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pendingId === invitation.id}
                  onClick={() => void handleRevoke(invitation.id)}
                >
                  {pendingId === invitation.id ? 'Revocando…' : 'Revocar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
