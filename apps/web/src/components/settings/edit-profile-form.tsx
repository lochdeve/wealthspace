'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { updateProfile } from '@/lib/api/auth';
import type { UserProfile } from '@/lib/api/types';
import { detectBrowserTimezone } from '@/lib/timezone/detect-timezone';
import { profileActionErrorMessage } from '@/lib/settings/profile-messages';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import authStyles from '@/components/auth/auth-forms.module.css';
import styles from '@/components/finance/finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type EditProfileFormProps = {
  initial: Pick<UserProfile, 'displayName' | 'timezone' | 'email'>;
};

export function EditProfileForm({ initial }: EditProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    const errors: Record<string, string> = {};
    if (!displayName.trim()) {
      errors.displayName = 'Introduce tu nombre visible.';
    }
    if (!timezone.trim()) {
      errors.timezone = 'Indica tu zona horaria.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        timezone: timezone.trim(),
      });
      setSaved(true);
      router.refresh();
    } catch (error) {
      setFormError(profileActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      {saved ? (
        <p className={ui.alertSuccess} role="status">
          Perfil actualizado.
        </p>
      ) : null}
      <Field id="profile-email" label="Correo">
        <TextInput id="profile-email" value={initial.email} disabled readOnly />
      </Field>
      <Field
        id="profile-display-name"
        label="Nombre visible"
        error={fieldErrors.displayName}
      >
        <TextInput
          id="profile-display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          hasError={Boolean(fieldErrors.displayName)}
          disabled={pending}
          required
          autoComplete="name"
        />
      </Field>
      <Field
        id="profile-timezone"
        label="Zona horaria"
        error={fieldErrors.timezone}
        hint="Se usa para los informes mensuales de consumo (IANA)."
      >
        <div className={authStyles.timezoneRow}>
          <TextInput
            id="profile-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            hasError={Boolean(fieldErrors.timezone)}
            disabled={pending}
            required
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setTimezone(detectBrowserTimezone())}
          >
            Detectar
          </Button>
        </div>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}