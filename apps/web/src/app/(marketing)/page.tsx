import Link from 'next/link';
import styles from './page.module.css';
import ui from '@/components/ui/ui.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.eyebrow}>Finanzas personales y compartidas</p>
        <h1 className={styles.title}>Wealthspace</h1>
        <p className={styles.lead}>
          Gestiona tu dinero en espacios independientes: un espacio personal privado y espacios
          compartidos para hogar, pareja, viajes y más.
        </p>
        <div className={styles.actions}>
          <Link className={ui.button} href="/login">
            Iniciar sesión
          </Link>
          <Link className={ui.buttonSecondary} href="/register">
            Crear cuenta
          </Link>
        </div>
        <p className={styles.meta}>Monorepo · Next.js + NestJS</p>
      </main>
    </div>
  );
}
