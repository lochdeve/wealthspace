'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { archiveAccount } from '@/lib/api/accounts';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import ui from '@/components/ui/ui.module.css';

type ArchiveAccountButtonProps = {
  spaceId: string;
  accountId: string;
  accountName: string;
};

export function ArchiveAccountButton({
  spaceId,
  accountId,
  accountName,
}: ArchiveAccountButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(`¿Archivar «${accountName}»? No admitirá nuevos movimientos.`);
    if (!confirmed) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      await archiveAccount(spaceId, accountId);
      router.push(`/spaces/${spaceId}/accounts`);
      router.refresh();
    } catch (err) {
      setError(financeActionErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div aria-label="Archivar cuenta">
      {error ? (
        <p className={ui.alert} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={ui.buttonDanger}
        disabled={pending}
        onClick={() => void handleArchive()}
      >
        {pending ? 'Archivando…' : 'Archivar cuenta'}
      </button>
    </div>
  );
}
