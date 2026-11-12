import { apiRequest } from '@/lib/api/client';
import type { CreateSharedSpaceInput, SpaceDetail, SpaceListItem } from '@/lib/api/space-types';

export function listSpaces(): Promise<SpaceListItem[]> {
  return apiRequest<SpaceListItem[]>('/spaces', { method: 'GET' });
}

export function listSpacesWithCookie(cookieHeader: string): Promise<SpaceListItem[]> {
  return apiRequest<SpaceListItem[]>('/spaces', {
    method: 'GET',
    cookieHeader,
  });
}

export function createSharedSpace(data: CreateSharedSpaceInput): Promise<SpaceDetail> {
  return apiRequest<SpaceDetail>('/spaces', {
    method: 'POST',
    body: data,
  });
}

export function getSpace(spaceId: string): Promise<SpaceDetail> {
  return apiRequest<SpaceDetail>(`/spaces/${spaceId}`, { method: 'GET' });
}

export function getSpaceWithCookie(spaceId: string, cookieHeader: string): Promise<SpaceDetail> {
  return apiRequest<SpaceDetail>(`/spaces/${spaceId}`, {
    method: 'GET',
    cookieHeader,
  });
}
