import { apiRequest } from '@/lib/api/client';
import type { SpaceMember } from '@/lib/api/space-types';

export function listSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  return apiRequest<SpaceMember[]>(`/spaces/${spaceId}/members`, { method: 'GET' });
}

export function listSpaceMembersWithCookie(
  spaceId: string,
  cookieHeader: string,
): Promise<SpaceMember[]> {
  return apiRequest<SpaceMember[]>(`/spaces/${spaceId}/members`, {
    method: 'GET',
    cookieHeader,
  });
}

export function leaveSpace(spaceId: string): Promise<void> {
  return apiRequest<void>(`/spaces/${spaceId}/membership/leave`, { method: 'POST' });
}

export function removeMember(spaceId: string, userId: string): Promise<void> {
  return apiRequest<void>(`/spaces/${spaceId}/members/${userId}/remove`, { method: 'POST' });
}
