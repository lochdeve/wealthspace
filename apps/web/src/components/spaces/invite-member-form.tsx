'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createSpaceInvitation } from '@/lib/api/invitations';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './spaces-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type InviteMemberFormProps = {
  spaceId: string;
};

export function InviteMemberForm({ spaceId }: InviteMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = 'Introduce un correo.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }
    setPending(true);
    try {
      await createSpaceInvitation(spaceId, {
        email: email.trim().toLowerCase(),
        role,
      });
      setEmail('');
      router.refresh();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'No se pudo enviar la invitación.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.sectionTitle}>Invitar por correo</h2>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="invite-email" label="Correo" error={fieldErrors.email}>
        <TextInput
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hasError={Boolean(fieldErrors.email)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="invite-role" label="Rol">
        <select
          id="invite-role"
          className={styles.selectNative}
          value={role}
          onChange={(event) => setRole(event.target.value as 'MEMBER' | 'ADMIN')}
          disabled={pending}
        >
          <option value="MEMBER">Miembro</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar invitación'}
      </Button>
    </form>
  );
}
