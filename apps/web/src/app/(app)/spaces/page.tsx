import Link from 'next/link';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { listSpacesWithCookie } from '@/lib/api/spaces';
import { membershipRoleLabel, spaceTypeLabel } from '@/lib/spaces/labels';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import { getActiveSpaceId } from '@/lib/spaces/active-space.server';
import { resolveActiveSpaceId } from '@/lib/spaces/resolve-active-space';
import styles from '../app-pages.module.css';

export default async function SpacesPage() {
  await requireUser();
  const user = await getCurrentUser();
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader || !user) {
    return null;
  }

  const spaces = await listSpacesWithCookie(cookieHeader);
  const resolvedActive = await resolveActiveSpaceId(spaces, user.personalSpaceId);
  const storedActive = await getActiveSpaceId();
  const shouldSyncActive =
    resolvedActive !== null && resolvedActive !== storedActive ? resolvedActive : null;

  return (
    <section aria-labelledby="spaces-title">
      {shouldSyncActive ? <SyncActiveSpace spaceId={shouldSyncActive} /> : null}
      <header className={styles.pageHeader}>
        <div>
          <h1 id="spaces-title" className={styles.title}>
            Tus espacios
          </h1>
          <p className={styles.lead}>Espacios personales y compartidos donde participas.</p>
        </div>
        <Link href="/spaces/new">Crear espacio compartido</Link>
      </header>

      {spaces.length === 0 ? (
        <p className={styles.lead}>
          Aún no hay espacios. Regístrate de nuevo si falta el personal.
        </p>
      ) : (
        <ul className={styles.spaceGrid}>
          {spaces.map((space) => (
            <li key={space.id} className={styles.spaceCard}>
              <span className={styles.badge}>
                {spaceTypeLabel(space.type)} · {membershipRoleLabel(space.role)}
              </span>
              <p>
                <Link href={`/spaces/${space.id}`}>{space.name}</Link>
              </p>
              {space.displayCurrency ? (
                <p className={styles.lead}>Moneda: {space.displayCurrency}</p>
              ) : null}
              {resolvedActive === space.id ? (
                <p className={styles.lead} aria-label="Espacio activo">
                  Espacio activo
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
