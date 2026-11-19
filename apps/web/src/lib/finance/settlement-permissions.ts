import type { Settlement } from '@/lib/api/settlement-types';
import type { MembershipRole } from '@/lib/api/space-types';

export function canRegisterSettlement(
  actorRole: MembershipRole,
  actorUserId: string,
  fromUserId: string,
  toUserId: string,
): boolean {
  if (actorRole === 'OWNER' || actorRole === 'ADMIN') {
    return true;
  }
  return actorUserId === fromUserId || actorUserId === toUserId;
}

export function canVoidSettlement(
  actorRole: MembershipRole,
  actorUserId: string,
  settlement: Pick<Settlement, 'recordedByUserId' | 'fromUserId' | 'toUserId'>,
): boolean {
  if (actorRole === 'OWNER' || actorRole === 'ADMIN') {
    return true;
  }
  return (
    actorUserId === settlement.recordedByUserId ||
    actorUserId === settlement.fromUserId ||
    actorUserId === settlement.toUserId
  );
}
