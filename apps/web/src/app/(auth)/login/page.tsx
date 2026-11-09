import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { redirectIfAuthenticated } from '@/lib/auth/session.server';

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return (
    <Suspense fallback={<p role="status">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
