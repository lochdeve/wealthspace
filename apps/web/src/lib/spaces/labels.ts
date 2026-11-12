import type { MembershipRole, SpaceType } from '@/lib/api/space-types';

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  PERSONAL: 'Personal',
  SHARED: 'Compartido',
};

const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
};

export function spaceTypeLabel(type: SpaceType): string {
  return SPACE_TYPE_LABELS[type];
}

export function membershipRoleLabel(role: MembershipRole): string {
  return ROLE_LABELS[role];
}

export function canManageInvitations(role: MembershipRole, type: SpaceType): boolean {
  return type === 'SHARED' && (role === 'OWNER' || role === 'ADMIN');
}

export function canRemoveMember(
  actorRole: MembershipRole,
  targetRole: MembershipRole,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (actorUserId === targetUserId) {
    return false;
  }
  if (actorRole === 'OWNER') {
    return targetRole === 'ADMIN' || targetRole === 'MEMBER';
  }
  if (actorRole === 'ADMIN') {
    return targetRole === 'MEMBER';
  }
  return false;
}
