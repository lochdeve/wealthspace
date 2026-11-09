import { getCurrentUser } from '@/lib/auth/session.server';
import styles from './dashboard.module.css';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className={styles.title}>
        Tu espacio
      </h1>
      <p className={styles.lead}>
        Has iniciado sesión. El espacio personal y el resto de funciones llegarán en fases
        siguientes.
      </p>
      <dl className={styles.card}>
        <div className={styles.row}>
          <dt>Nombre</dt>
          <dd>{user.displayName}</dd>
        </div>
        <div className={styles.row}>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
        </div>
        <div className={styles.row}>
          <dt>Zona horaria</dt>
          <dd>{user.timezone}</dd>
        </div>
        <div className={styles.row}>
          <dt>Espacio personal</dt>
          <dd>
            <code className={styles.code}>{user.personalSpaceId}</code>
          </dd>
        </div>
      </dl>
    </section>
  );
}
