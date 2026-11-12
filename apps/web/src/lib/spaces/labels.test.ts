import {
  canManageInvitations,
  canRemoveMember,
  membershipRoleLabel,
  spaceTypeLabel,
} from '@/lib/spaces/labels';

describe('space labels', () => {
  it('labels space types in Spanish', () => {
    expect(spaceTypeLabel('PERSONAL')).toBe('Personal');
    expect(spaceTypeLabel('SHARED')).toBe('Compartido');
  });

  it('allows invites for owner/admin on shared spaces only', () => {
    expect(canManageInvitations('OWNER', 'SHARED')).toBe(true);
    expect(canManageInvitations('MEMBER', 'SHARED')).toBe(false);
    expect(canManageInvitations('OWNER', 'PERSONAL')).toBe(false);
    expect(membershipRoleLabel('ADMIN')).toBe('Administrador');
  });

  it('encodes remove permissions for owners and admins', () => {
    const actor = 'user-actor';
    const other = 'user-other';
    expect(canRemoveMember('OWNER', 'MEMBER', actor, other)).toBe(true);
    expect(canRemoveMember('OWNER', 'ADMIN', actor, other)).toBe(true);
    expect(canRemoveMember('OWNER', 'OWNER', actor, other)).toBe(false);
    expect(canRemoveMember('ADMIN', 'MEMBER', actor, other)).toBe(true);
    expect(canRemoveMember('ADMIN', 'ADMIN', actor, other)).toBe(false);
    expect(canRemoveMember('MEMBER', 'MEMBER', actor, other)).toBe(false);
    expect(canRemoveMember('OWNER', 'MEMBER', actor, actor)).toBe(false);
  });
});
