import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './auth-layout.module.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Wealthspace
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
