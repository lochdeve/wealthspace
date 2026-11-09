import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import { requireUser } from '@/lib/auth/session.server';
import styles from './app-shell.module.css';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <Link href="/dashboard" className={styles.brand}>
            Wealthspace
          </Link>
          <span className={styles.userLabel} aria-label="Usuario con sesión iniciada">
            {user.displayName}
          </span>
        </div>
        <LogoutButton />
      </header>
      <main className={styles.main} id="main-content">
        {children}
      </main>
    </div>
  );
}
