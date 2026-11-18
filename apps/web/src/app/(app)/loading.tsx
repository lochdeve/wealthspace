import styles from './app-route-states.module.css';

export default function AppLoading() {
  return (
    <section className={styles.panel} aria-labelledby="app-loading-title" aria-busy="true">
      <h1 id="app-loading-title" className={styles.title}>
        Cargando…
      </h1>
      <p className={styles.lead} role="status">
        Un momento.
      </p>
    </section>
  );
}