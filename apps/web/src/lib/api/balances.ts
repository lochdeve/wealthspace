import { apiRequest } from '@/lib/api/client';
import type { SpaceBalances } from '@/lib/api/balance-types';

export function getSpaceBalances(spaceId: string): Promise<SpaceBalances> {
  return apiRequest<SpaceBalances>(`/spaces/${spaceId}/balances`, { method: 'GET' });
}

export function getSpaceBalancesWithCookie(
  spaceId: string,
  cookieHeader: string,
): Promise<SpaceBalances> {
  return apiRequest<SpaceBalances>(`/spaces/${spaceId}/balances`, {
    method: 'GET',
    cookieHeader,
  });
}