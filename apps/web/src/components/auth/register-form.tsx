'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { register } from '@/lib/api/auth';
import { AUTH_ERROR_CODES, userErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './auth-forms.module.css';
import ui from '@/components/ui/ui.module.css';

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validateClient(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) {
      nextErrors.email = 'Introduce tu correo.';
    }
    if (password.length < 10) {
      nextErrors.password = 'La contraseña debe tener al menos 10 caracteres.';
    }
    if (!displayName.trim()) {
      nextErrors.displayName = 'Introduce cómo quieres que te llamemos.';
    }
    if (!timezone.trim()) {
      nextErrors.timezone = 'Indica tu zona horaria.';
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validateClient()) {
      return;
    }
    setPending(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
        timezone: timezone.trim(),
      });
      router.replace('/login?registered=1');
    } catch (error) {
      setFormError(
        userErrorMessage(
          error,
          { [AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED]: 'Ese correo ya está registrado.' },
          'No se pudo crear la cuenta. Inténtalo de nuevo.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Crear cuenta</h1>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="displayName" label="Nombre visible" error={fieldErrors.displayName}>
        <TextInput
          id="displayName"
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          hasError={Boolean(fieldErrors.displayName)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="email" label="Correo electrónico" error={fieldErrors.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hasError={Boolean(fieldErrors.email)}
          disabled={pending}
          required
        />
      </Field>
      <Field
        id="password"
        label="Contraseña"
        error={fieldErrors.password}
        hint="Mínimo 10 caracteres."
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hasError={Boolean(fieldErrors.password)}
          disabled={pending}
          required
        />
      </Field>
      <Field
        id="timezone"
        label="Zona horaria"
        error={fieldErrors.timezone}
        hint="Se usa para informes mensuales (IANA, p. ej. Europe/Madrid)."
      >
        <div className={styles.timezoneRow}>
          <TextInput
            id="timezone"
            name="timezone"
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
            onClick={() => setTimezone(detectTimezone())}
          >
            Detectar
          </Button>
        </div>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando cuenta…' : 'Registrarse'}
      </Button>
      <p className={styles.footer}>
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </form>
  );
}
