import styles from './page.module.css';

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
        <p className={styles.meta}>Monorepo · Next.js + NestJS</p>
      </main>
    </div>
  );
}
