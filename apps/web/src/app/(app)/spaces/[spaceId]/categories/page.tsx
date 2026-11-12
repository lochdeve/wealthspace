import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { ApiError } from '@/lib/api/errors';
import { listCategoriesWithCookie } from '@/lib/api/categories';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { CategoryList } from '@/components/finance/category-list';
import { CreateCategoryForm } from '@/components/finance/create-category-form';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '../../../../app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function SpaceCategoriesPage({ params }: PageProps) {
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

  const categories = await listCategoriesWithCookie(spaceId, cookieHeader);

  return (
    <section aria-labelledby="categories-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <h1 id="categories-title" className={styles.title}>
            Categorías
          </h1>
          <p className={styles.lead}>Etiquetas de ingreso y gasto en este espacio.</p>
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones">
          <Link href={`/spaces/${spaceId}/accounts`}>← Cuentas</Link>
        </nav>
      </header>

      <div className={styles.stack}>
        <CreateCategoryForm spaceId={spaceId} existingCategories={categories} />
        <div>
          <h2 className={styles.sectionHeading}>Listado</h2>
          <CategoryList categories={categories} />
        </div>
      </div>
    </section>
  );
}
