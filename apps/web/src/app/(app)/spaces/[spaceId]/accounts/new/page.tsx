import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { CreateAccountForm } from '@/components/finance/create-account-form';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '../../../../app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function NewAccountPage({ params }: PageProps) {
  await requireUser();
  const { spaceId } = await params;
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
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

  return (
    <article aria-labelledby="new-account-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="new-account-title" className={styles.title}>
            Nueva cuenta
          </h1>
          <p className={styles.lead}>Moneda fija tras la creación.</p>
        </div>
        <Link href={`/spaces/${spaceId}/accounts`}>← Cuentas</Link>
      </header>
      <CreateAccountForm spaceId={spaceId} defaultCurrency={space.displayCurrency ?? 'EUR'} />
    </article>
  );
}
