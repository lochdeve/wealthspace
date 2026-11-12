import { PendingInvitationsList } from '@/components/invitations/pending-invitations-list';
import { getSessionCookieHeader, requireUser } from '@/lib/auth/session.server';
import { listMyInvitationsWithCookie } from '@/lib/api/invitations';
import { listSpacesWithCookie } from '@/lib/api/spaces';
import styles from '../app-pages.module.css';

export default async function InvitationsPage() {
  await requireUser();
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }

  const [invitations, spaces] = await Promise.all([
    listMyInvitationsWithCookie(cookieHeader),
    listSpacesWithCookie(cookieHeader),
  ]);

  const pending = invitations.filter((row) => row.status === 'PENDING');
  const spacesById = Object.fromEntries(spaces.map((space) => [space.id, space]));

  return (
    <section aria-labelledby="invitations-title">
      <h1 id="invitations-title" className={styles.title}>
        Invitaciones
      </h1>
      <p className={styles.lead}>Invitaciones pendientes a espacios compartidos.</p>
      <PendingInvitationsList invitations={pending} spacesById={spacesById} />
    </section>
  );
}
