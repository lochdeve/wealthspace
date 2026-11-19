import Link from 'next/link';
import { InviteMemberForm } from '@/components/spaces/invite-member-form';
import { LeaveSpaceButton } from '@/components/spaces/leave-space-button';
import { TransferOwnershipForm } from '@/components/spaces/transfer-ownership-form';
import { SpaceInvitationsPanel } from '@/components/spaces/space-invitations-panel';
import { SpaceMembersPanel } from '@/components/spaces/space-members-panel';
import { getSessionCookieHeader, getCurrentUser, requireUser } from '@/lib/auth/session.server';
import { rethrowUnlessSpaceFound } from '@/lib/api/page-errors.server';
import { listSpaceMembersWithCookie } from '@/lib/api/memberships';
import { getSpaceWithCookie } from '@/lib/api/spaces';
import { listSpaceInvitationsWithCookie } from '@/lib/api/invitations';
import { canManageInvitations, membershipRoleLabel, spaceTypeLabel } from '@/lib/spaces/labels';
import { SpaceFinanceNav } from '@/components/finance/space-finance-nav';
import { SyncActiveSpace } from '@/components/spaces/sync-active-space';
import styles from '@/app/(app)/app-pages.module.css';

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function SpaceDetailPage({ params }: PageProps) {
  await requireUser();
  const user = await getCurrentUser();
  const { spaceId } = await params;
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  let space;
  try {
    space = await getSpaceWithCookie(spaceId, cookieHeader);
  } catch (error) {
    rethrowUnlessSpaceFound(error);
  }

  const isShared = space.type === 'SHARED';
  const showInvites = canManageInvitations(space.role, space.type);
  const invitations = showInvites
    ? await listSpaceInvitationsWithCookie(spaceId, cookieHeader)
    : [];
  const members = isShared ? await listSpaceMembersWithCookie(spaceId, cookieHeader) : [];

  return (
    <article aria-labelledby="space-detail-title">
      <SyncActiveSpace spaceId={space.id} />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.badge}>
            {spaceTypeLabel(space.type)} · {membershipRoleLabel(space.role)}
          </p>
          <h1 id="space-detail-title" className={styles.title}>
            {space.name}
          </h1>
          {space.displayCurrency ? (
            <p className={styles.lead}>Moneda de informes: {space.displayCurrency}</p>
          ) : null}
          {isShared ? (
            <p className={styles.lead}>
              {members.length === 1 ? '1 persona en el espacio' : `${members.length} personas`}
            </p>
          ) : null}
        </div>
        <nav className={styles.pageHeaderActions} aria-label="Acciones del espacio">
          <Link href="/spaces">← Tus espacios</Link>
        </nav>
      </header>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Finanzas</h2>
        <SpaceFinanceNav spaceId={spaceId} spaceType={space.type} />
        {isShared ? (
          <p className={styles.lead}>
            <strong>Gasto compartido:</strong> reparto entre miembros y deudas al guardar.{' '}
            <strong>Gasto individual:</strong> solo una persona, sin reparto ni deudas.
          </p>
        ) : null}
      </div>

      {isShared ? (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Personas</h2>
            {user ? (
              <SpaceMembersPanel
                spaceId={spaceId}
                members={members}
                currentUserId={user.id}
                actorRole={space.role}
              />
            ) : null}
          </div>

          {showInvites ? (
            <div className={styles.section}>
              <h2 className={styles.sectionHeading}>Acceso e invitaciones</h2>
              <div className={styles.stack}>
                <InviteMemberForm spaceId={spaceId} />
                <SpaceInvitationsPanel spaceId={spaceId} invitations={invitations} />
              </div>
            </div>
          ) : null}

          {space.role === 'OWNER' && user ? (
            <TransferOwnershipForm
              spaceId={spaceId}
              spaceName={space.name}
              currentUserId={user.id}
              members={members}
            />
          ) : null}

          {user ? (
            <LeaveSpaceButton
              spaceId={spaceId}
              spaceName={space.name}
              currentUserId={user.id}
              activeMemberCount={members.length}
            />
          ) : null}
        </>
      ) : null}
    </article>
  );
}
