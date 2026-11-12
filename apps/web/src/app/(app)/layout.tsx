import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import { SpaceSwitcher } from '@/components/spaces/space-switcher';
import { getActiveSpaceId } from '@/lib/spaces/active-space.server';
import { requireUser } from '@/lib/auth/session.server';
import styles from './app-shell.module.css';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const activeSpaceId = await getActiveSpaceId();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <Link href="/spaces" className={styles.brand}>
            Wealthspace
          </Link>
          <span className={styles.userLabel} aria-label="Usuario con sesión iniciada">
            {user.displayName}
          </span>
        </div>
        <nav className={styles.appNav} aria-label="Aplicación">
          <Link href="/spaces">Espacios</Link>
          <Link href="/accounts">Cuentas</Link>
          <Link href="/invitations">Invitaciones</Link>
          <SpaceSwitcher activeSpaceId={activeSpaceId} />
        </nav>
        <LogoutButton />
      </header>
      <main className={styles.main} id="main-content">
        {children}
      </main>
    </div>
  );
}
