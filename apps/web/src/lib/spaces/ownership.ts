import type { SpaceMember } from '@/lib/api/space-types';

/** B-4.1 / F-4.1: targets must be ACTIVE ADMIN or MEMBER, not the current owner. */
export function listOwnershipTransferTargets(
  members: SpaceMember[],
  currentOwnerUserId: string,
): SpaceMember[] {
  return members.filter(
    (member) =>
      member.userId !== currentOwnerUserId && (member.role === 'ADMIN' || member.role === 'MEMBER'),
  );
}
