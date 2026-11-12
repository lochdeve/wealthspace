import type { MembershipRole } from '@/lib/api/space-types';

/** UX helper only — API enforces attribution rules on SHARED expenses. */
export function canPickAttributionFor(
  actorRole: MembershipRole,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (actorRole === 'MEMBER') {
    return actorUserId === targetUserId;
  }
  return actorRole === 'OWNER' || actorRole === 'ADMIN';
}
