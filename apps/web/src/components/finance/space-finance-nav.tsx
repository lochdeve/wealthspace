import Link from 'next/link';
import styles from '@/app/(app)/app-pages.module.css';

type SpaceFinanceNavProps = {
  spaceId: string;
};

export function SpaceFinanceNav({ spaceId }: SpaceFinanceNavProps) {
  return (
    <nav className={styles.nav} aria-label="Finanzas del espacio">
      <Link href={`/spaces/${spaceId}/accounts`}>Cuentas</Link>
      <Link href={`/spaces/${spaceId}/transactions`}>Movimientos</Link>
      <Link href={`/spaces/${spaceId}/categories`}>Categorías</Link>
    </nav>
  );
}
