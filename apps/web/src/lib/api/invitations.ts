import { apiRequest } from '@/lib/api/client';
import type { CreateInvitationInput, Invitation } from '@/lib/api/space-types';

export function listMyInvitations(): Promise<Invitation[]> {
  return apiRequest<Invitation[]>('/invitations', { method: 'GET' });
}

export function listMyInvitationsWithCookie(cookieHeader: string): Promise<Invitation[]> {
  return apiRequest<Invitation[]>('/invitations', {
    method: 'GET',
    cookieHeader,
  });
}

export function acceptInvitation(invitationId: string): Promise<void> {
  return apiRequest<void>(`/invitations/${invitationId}/accept`, { method: 'POST' });
}

export function rejectInvitation(invitationId: string): Promise<void> {
  return apiRequest<void>(`/invitations/${invitationId}/reject`, { method: 'POST' });
}

export function listSpaceInvitations(spaceId: string): Promise<Invitation[]> {
  return apiRequest<Invitation[]>(`/spaces/${spaceId}/invitations`, { method: 'GET' });
}

export function createSpaceInvitation(
  spaceId: string,
  data: CreateInvitationInput,
): Promise<Invitation> {
  return apiRequest<Invitation>(`/spaces/${spaceId}/invitations`, {
    method: 'POST',
    body: data,
  });
}

export function revokeSpaceInvitation(spaceId: string, invitationId: string): Promise<void> {
  return apiRequest<void>(`/spaces/${spaceId}/invitations/${invitationId}/revoke`, {
    method: 'POST',
  });
}

export function listSpaceInvitationsWithCookie(
  spaceId: string,
  cookieHeader: string,
): Promise<Invitation[]> {
  return apiRequest<Invitation[]>(`/spaces/${spaceId}/invitations`, {
    method: 'GET',
    cookieHeader,
  });
}
