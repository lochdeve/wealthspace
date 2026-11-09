import { RegisterForm } from '@/components/auth/register-form';
import { redirectIfAuthenticated } from '@/lib/auth/session.server';

export default async function RegisterPage() {
  await redirectIfAuthenticated();
  return <RegisterForm />;
}
