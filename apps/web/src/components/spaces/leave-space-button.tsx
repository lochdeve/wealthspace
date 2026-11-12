'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { leaveSpace } from '@/lib/api/memberships';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';
import { clearActiveSpaceId } from '@/lib/spaces/active-space.server';
import pageStyles from '@/app/(app)/app-pages.module.css';
import ui from '@/components/ui/ui.module.css';

type LeaveSpaceButtonProps = {
  spaceId: string;
  spaceName: string;
};

export function LeaveSpaceButton({ spaceId, spaceName }: LeaveSpaceButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLeave() {
    const confirmed = window.confirm(
      `¿Salir de «${spaceName}»? Dejarás de ver este espacio hasta que te inviten de nuevo.`,
    );
    if (!confirmed) {
      return;
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
