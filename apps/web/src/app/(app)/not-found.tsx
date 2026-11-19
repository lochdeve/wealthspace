import Link from 'next/link';
import styles from './app-route-states.module.css';

export default function AppNotFound() {
  return (
    <section className={styles.panel} aria-labelledby="app-not-found-title">
      <h1 id="app-not-found-title" className={styles.title}>
        No encontrado
      </h1>
      <p className={styles.lead}>
        Esta página no existe o ya no tienes acceso. Comprueba la URL o vuelve a tus espacios.
      </p>
      <nav className={styles.actions} aria-label="Acciones">
        <Link href="/spaces">Ir a espacios</Link>
      </nav>
    </section>
  );
}
