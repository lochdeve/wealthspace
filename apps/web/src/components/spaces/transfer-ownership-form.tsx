'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import type { SpaceMember } from '@/lib/api/space-types';
import { transferOwnership } from '@/lib/api/memberships';
import { listOwnershipTransferTargets } from '@/lib/spaces/ownership';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';
import { membershipRoleLabel } from '@/lib/spaces/labels';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import styles from './spaces-forms.module.css';
import pageStyles from '@/app/(app)/app-pages.module.css';
import ui from '@/components/ui/ui.module.css';

type TransferOwnershipFormProps = {
  spaceId: string;
  spaceName: string;
  currentUserId: string;
  members: SpaceMember[];
};

export function TransferOwnershipForm({
  spaceId,
  spaceName,
  currentUserId,
  members,
}: TransferOwnershipFormProps) {
  const router = useRouter();
  const targets = useMemo(
    () => listOwnershipTransferTargets(members, currentUserId),
    [members, currentUserId],
  );
  const [newOwnerUserId, setNewOwnerUserId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);
    if (!newOwnerUserId) {
      setFormError('Selecciona la persona que será la nueva propietaria.');
      return;
    }

    const target = targets.find((row) => row.userId === newOwnerUserId);
    const label = target ? `${target.displayName} (${membershipRoleLabel(target.role)})` : '';
    const confirmed = window.confirm(
      `¿Transferir el ownership de «${spaceName}» a ${label}? Pasarás a ser administrador/a de inmediato.`,
    );
    if (!confirmed) {
      return;
    }

    setPending(true);
    try {
      await transferOwnership(spaceId, newOwnerUserId);
      setSuccess(true);
      setNewOwnerUserId('');
      router.refresh();
    } catch (error) {
      setFormError(membershipActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (targets.length === 0) {
    return (
      <section className={pageStyles.section} aria-labelledby="transfer-ownership-title">
        <h2 id="transfer-ownership-title" className={pageStyles.sectionHeading}>
          Ownership del espacio
        </h2>
        <p className={styles.meta}>
          No hay otra persona activa (administrador o miembro) a quien transferir el ownership.
          Invita a alguien antes de intentar salir como única/o propietaria/o.
        </p>
      </section>
    );
  }

  return (
    <section className={pageStyles.section} aria-labelledby="transfer-ownership-title">
      <h2 id="transfer-ownership-title" className={pageStyles.sectionHeading}>
        Transferir ownership
      </h2>
      <p className={styles.meta}>
        Solo el propietario puede hacerlo. La persona elegida se convierte en propietaria y tú pasas
        a administrador/a.
      </p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {success ? (
          <p className={ui.alertSuccess} role="status">
            Ownership transferido correctamente.
          </p>
        ) : null}
        {formError ? (
          <p className={ui.alert} role="alert">
            {formError}
          </p>
        ) : null}
        <Field id="transfer-new-owner" label="Nueva propietaria">
          <select
            id="transfer-new-owner"
            className={styles.selectNative}
            value={newOwnerUserId}
            onChange={(event) => setNewOwnerUserId(event.target.value)}
            disabled={pending}
            required
          >
            <option value="">Selecciona…</option>
            {targets.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName} · {membershipRoleLabel(member.role)}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? 'Transfiriendo…' : 'Transferir ownership'}
        </Button>
      </form>
    </section>
  );
}
