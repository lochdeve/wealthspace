'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { SERVICE_UNAVAILABLE_MESSAGE } from '@/lib/api/errors';
import { redirectBrowserToLogin } from '@/lib/auth/login-redirect';
import { Button } from '@/components/ui/button';
import styles from './app-route-states.module.css';

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function userFacingMessage(error: Error): string {
  if (error.message.startsWith('HTTP 5')) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }
  if (error.message === 'HTTP 401' || error.message.includes('Authentication required')) {
    return 'Tu sesión ha caducado. Te redirigimos al inicio de sesión.';
  }
  return 'No se pudo cargar esta página. Puedes reintentar o volver a tus espacios.';
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
    if (error.message === 'HTTP 401' || error.message.includes('Authentication required')) {
      redirectBrowserToLogin();
    }
  }, [error]);

  return (
    <section className={styles.panel} aria-labelledby="app-error-title" role="alert">
      <h1 id="app-error-title" className={styles.title}>
        Algo salió mal
      </h1>
      <p className={styles.lead}>{userFacingMessage(error)}</p>
      <div className={styles.actions} aria-label="Acciones">
        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
        <Link href="/spaces">Ir a espacios</Link>
      </div>
    </section>
  );
}
