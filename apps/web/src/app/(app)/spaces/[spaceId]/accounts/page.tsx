import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { listAccountsWithCookie } from '@/lib/api/accounts';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { formatMoneyAmount } from '@/lib/finance/format-money';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '../../../app-pages.module.css';
import financeStyles from '@/components/finance/finance-forms.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ archived?: string }>;
};

export default async function SpaceAccountsPage({ params, searchParams }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId } = await params;
  const { archived } = await searchParams;
  const includeArchived = archived === '1';
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader || !user) {
    return null;
  }

  let space;
  try {
    space = await getSpaceWithCookie(spaceId, cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  if (space.type !== 'PERSONAL') {
    return (
      <article aria-labelledby="accounts-personal-only">
        <SyncActiveSpace spaceId={space.id} />
        <h1 id="accounts-personal-only" className={styles.title}>
          Cuentas
        </h1>
        <p className={styles.lead}>
          En este slice las cuentas y movimientos están en el <strong>espacio personal</strong>. Los
          espacios compartidos tendrán gastos con atribución en fases posteriores.
        </p>
        <Link href={`/spaces/${user.personalSpaceId}/accounts`}>Ir a mi espacio personal</Link>
      </article>
    );
  }

  const accounts = await listAccountsWithCookie(spaceId, cookieHeader, { includeArchived });

  return (
    <section aria-labelledby="accounts-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="accounts-title" className={styles.title}>
            Cuentas
          </h1>
          <p className={styles.lead}>Espacio personal · saldos calculados por la API.</p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={`/spaces/${spaceId}/accounts/new`}>Nueva cuenta</Link>
          <Link href={`/spaces/${spaceId}/categories`}>Categorías</Link>
          <Link
            href={
              includeArchived
                ? `/spaces/${spaceId}/accounts`
                : `/spaces/${spaceId}/accounts?archived=1`
            }
          >
            {includeArchived ? 'Ocultar archivadas' : 'Ver archivadas'}
          </Link>
          <Link href={`/spaces/${spaceId}`}>← Espacio</Link>
        </nav>
      </header>

      {accounts.length === 0 ? (
        <p className={styles.lead}>
          No tienes cuentas. <Link href={`/spaces/${spaceId}/accounts/new`}>Crea la primera</Link>.
        </p>
      ) : (
        <ul className={financeStyles.list}>
          {accounts.map((account) => (
            <li key={account.id} className={financeStyles.listItem}>
              <div className={financeStyles.listItemHeader}>
                <Link href={`/spaces/${spaceId}/accounts/${account.id}`}>
                  <strong>{account.name}</strong>
                </Link>
                <span>{formatMoneyAmount(account.balance, account.currency)}</span>
              </div>
              <p className={financeStyles.meta}>
                {account.currency}
                {account.archivedAt ? ' · Archivada' : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
