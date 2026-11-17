import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type {
  CreateSettlementInput,
  ListSettlementsQuery,
  Settlement,
  VoidSettlementInput,
} from '@/lib/api/settlement-types';

export function listSettlements(
  spaceId: string,
  query: ListSettlementsQuery = {},
): Promise<Settlement[]> {
  const qs = toQueryString({
    userId: query.userId,
    includeVoided: query.includeVoided,
    limit: query.limit,
  });
  return apiRequest<Settlement[]>(`/spaces/${spaceId}/settlements${qs}`, { method: 'GET' });
}

export function listSettlementsWithCookie(
  spaceId: string,
  cookieHeader: string,
  query: ListSettlementsQuery = {},
): Promise<Settlement[]> {
  const qs = toQueryString({
    userId: query.userId,
    includeVoided: query.includeVoided,
    limit: query.limit,
  });
  return apiRequest<Settlement[]>(`/spaces/${spaceId}/settlements${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function createSettlement(
  spaceId: string,
  data: CreateSettlementInput,
): Promise<Settlement> {
  return apiRequest<Settlement>(`/spaces/${spaceId}/settlements`, {
    method: 'POST',
    body: data,
  });
}

export function voidSettlement(
  spaceId: string,
  settlementId: string,
  data: VoidSettlementInput,
): Promise<Settlement> {
  return apiRequest<Settlement>(`/spaces/${spaceId}/settlements/${settlementId}/void`, {
    method: 'POST',
    body: data,
  });
}