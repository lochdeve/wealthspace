export type SpaceType = 'PERSONAL' | 'SHARED';

export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export type SpaceListItem = {
  id: string;
  type: SpaceType;
  name: string;
  displayCurrency: string | null;
  role: MembershipRole;
  joinedAt: string;
};

export type SpaceDetail = SpaceListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CreateSharedSpaceInput = {
  name: string;
  displayCurrency?: string;
};

export type Invitation = {
  id: string;
  spaceId: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  invitedByUserId: string;
  expiresAt: string | null;
  createdAt: string;
  /** GET /invitations (inbox) */
  spaceName?: string;
  invitedByDisplayName?: string;
};

export type CreateInvitationInput = {
  email: string;
  role?: Extract<MembershipRole, 'MEMBER' | 'ADMIN'>;
};

export type SpaceMember = {
  userId: string;
  displayName: string;
  email: string;
  role: MembershipRole;
  joinedAt: string;
};
