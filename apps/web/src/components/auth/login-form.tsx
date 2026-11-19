'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { login } from '@/lib/api/auth';
import { AUTH_ERROR_CODES, userErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './auth-forms.module.css';
import ui from '@/components/ui/ui.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const registered = searchParams.get('registered') === '1';

  function validateClient(): boolean {
    const nextErrors: typeof fieldErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'Introduce tu correo.';
    }
    if (password.length < 10) {
      nextErrors.password = 'La contraseña debe tener al menos 10 caracteres.';
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
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      const next = searchParams.get('next');
      const destination =
        next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setFormError(
        userErrorMessage(
          error,
          { [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Correo o contraseña incorrectos.' },
          'No se pudo iniciar sesión. Inténtalo de nuevo.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Iniciar sesión</h1>
      {registered ? (
        <p className={ui.alertSuccess} role="status">
          Cuenta creada. Inicia sesión para continuar.
        </p>
      ) : null}
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
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
        hint="Mínimo 10 caracteres (como en el registro)."
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hasError={Boolean(fieldErrors.password)}
          disabled={pending}
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className={styles.footer}>
        ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
      </p>
    </form>
  );
}
