import Link from 'next/link';
import { EditProfileForm } from '@/components/settings/edit-profile-form';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import styles from '@/app/(app)/app-pages.module.css';

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  return (
    <section aria-labelledby="settings-title">
      <header className={styles.pageHeader}>
        <div>
          <h1 id="settings-title" className={styles.title}>
            Ajustes
          </h1>
          <p className={styles.lead}>
            Tu nombre visible y zona horaria se usan en la app y en los informes mensuales.
          </p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href="/dashboard">← Panel</Link>
        </nav>
      </header>
      <EditProfileForm initial={user} />
    </section>
  );
}
