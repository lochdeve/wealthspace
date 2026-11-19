'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSpaceBalances } from '@/lib/api/balances';
import { leaveSpace } from '@/lib/api/memberships';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';
import { appendNonZeroNetBalanceNotice } from '@/lib/spaces/member-balance-warning';
import {
  appendLastActiveMemberLeaveNotice,
  isSoleActiveMember,
  LAST_ACTIVE_LEAVE_SECOND_CONFIRM,
} from '@/lib/spaces/leave-space-confirm';
import { clearActiveSpaceId } from '@/lib/spaces/active-space.server';
import pageStyles from '@/app/(app)/app-pages.module.css';
import ui from '@/components/ui/ui.module.css';

type LeaveSpaceButtonProps = {
  spaceId: string;
  spaceName: string;
  currentUserId: string;
  activeMemberCount: number;
};

export function LeaveSpaceButton({
  spaceId,
  spaceName,
  currentUserId,
  activeMemberCount,
}: LeaveSpaceButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLeave() {
    let confirmMessage = `¿Salir de «${spaceName}»? Dejarás de ver este espacio hasta que te inviten de nuevo.`;
    try {
      const balances = await getSpaceBalances(spaceId);
      confirmMessage = appendNonZeroNetBalanceNotice(
        confirmMessage,
        balances,
        currentUserId,
        'second',
      );
    } catch {
      // P-19 is informative only; proceed with the default confirm if balances fail.
    }
    confirmMessage = appendLastActiveMemberLeaveNotice(confirmMessage, activeMemberCount);

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    if (isSoleActiveMember(activeMemberCount)) {
      const second = window.confirm(LAST_ACTIVE_LEAVE_SECOND_CONFIRM);
      if (!second) {
        return;
      }
    }

    setError(null);
    setPending(true);
    try {
      await leaveSpace(spaceId);
      await clearActiveSpaceId();
      router.push('/spaces');
      router.refresh();
    } catch (err) {
      setError(membershipActionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className={pageStyles.dangerZone} aria-labelledby="leave-space-title">
      <p id="leave-space-title" className={pageStyles.dangerZoneTitle}>
        Abandonar espacio
      </p>
      <p className={pageStyles.dangerZoneLead}>
        Dejarás de acceder a «{spaceName}». Un propietario puede invitarte de nuevo.
      </p>
      {isSoleActiveMember(activeMemberCount) ? (
        <p className={ui.alert} role="status">
          Eres la única persona activa. Si sales, el espacio quedará sin miembros hasta una nueva
          invitación (C-05).
        </p>
      ) : null}
      {error ? (
        <p className={ui.alert} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={ui.buttonDanger}
        disabled={pending}
        onClick={() => void handleLeave()}
      >
        {pending ? 'Saliendo…' : 'Salir del espacio'}
      </button>
    </aside>
  );
}
