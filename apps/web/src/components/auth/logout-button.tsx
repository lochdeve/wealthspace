'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
    } finally {
      router.replace('/');
      router.refresh();
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleLogout} disabled={pending}>
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </Button>
  );
}
