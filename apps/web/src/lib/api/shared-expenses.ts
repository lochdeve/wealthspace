import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type {
  CreateSharedExpenseInput,
  SharedExpenseDetail,
  SharedExpenseRevision,
  UpdateSharedExpenseInput,
  VoidSharedExpenseInput,
} from '@/lib/api/shared-expense-types';

export type ListSharedExpensesQuery = {
  from?: string;
  to?: string;
  participantUserId?: string;
  includeVoided?: boolean;
  limit?: number;
};

export function listSharedExpenses(
  spaceId: string,
  query: ListSharedExpensesQuery = {},
): Promise<SharedExpenseDetail[]> {
  const qs = toQueryString({
    from: query.from,
    to: query.to,
    participantUserId: query.participantUserId,
    includeVoided: query.includeVoided,
    limit: query.limit,
  });
  return apiRequest<SharedExpenseDetail[]>(`/spaces/${spaceId}/shared-expenses${qs}`, {
    method: 'GET',
  });
}

export function listSharedExpensesWithCookie(
  spaceId: string,
  cookieHeader: string,
  query: ListSharedExpensesQuery = {},
): Promise<SharedExpenseDetail[]> {
  const qs = toQueryString({
    from: query.from,
    to: query.to,
    participantUserId: query.participantUserId,
    includeVoided: query.includeVoided,
    limit: query.limit,
  });
  return apiRequest<SharedExpenseDetail[]>(`/spaces/${spaceId}/shared-expenses${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function previewSharedExpense(
  spaceId: string,
  data: CreateSharedExpenseInput,
): Promise<SharedExpenseDetail> {
  return apiRequest<SharedExpenseDetail>(`/spaces/${spaceId}/shared-expenses/preview`, {
    method: 'POST',
    body: data,
  });
}

export function createSharedExpense(
  spaceId: string,
  data: CreateSharedExpenseInput,
): Promise<SharedExpenseDetail> {
  return apiRequest<SharedExpenseDetail>(`/spaces/${spaceId}/shared-expenses`, {
    method: 'POST',
    body: data,
  });
}

export function getSharedExpense(
  spaceId: string,
  sharedExpenseId: string,
): Promise<SharedExpenseDetail> {
  return apiRequest<SharedExpenseDetail>(`/spaces/${spaceId}/shared-expenses/${sharedExpenseId}`, {
    method: 'GET',
  });
}

export function getSharedExpenseWithCookie(
  spaceId: string,
  sharedExpenseId: string,
  cookieHeader: string,
): Promise<SharedExpenseDetail> {
  return apiRequest<SharedExpenseDetail>(`/spaces/${spaceId}/shared-expenses/${sharedExpenseId}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function updateSharedExpense(
  spaceId: string,
  sharedExpenseId: string,
  data: UpdateSharedExpenseInput,
): Promise<SharedExpenseDetail> {
  return apiRequest<SharedExpenseDetail>(`/spaces/${spaceId}/shared-expenses/${sharedExpenseId}`, {
    method: 'PATCH',
    body: data,
  });
}

export function voidSharedExpense(
  spaceId: string,
  sharedExpenseId: string,
  data: VoidSharedExpenseInput,
): Promise<SharedExpenseDetail> {
  return apiRequest<SharedExpenseDetail>(
    `/spaces/${spaceId}/shared-expenses/${sharedExpenseId}/void`,
    {
      method: 'POST',
      body: data,
    },
  );
}

export function listSharedExpenseRevisions(
  spaceId: string,
  sharedExpenseId: string,
): Promise<SharedExpenseRevision[]> {
  return apiRequest<SharedExpenseRevision[]>(
    `/spaces/${spaceId}/shared-expenses/${sharedExpenseId}/revisions`,
    { method: 'GET' },
  );
}

export function listSharedExpenseRevisionsWithCookie(
  spaceId: string,
  sharedExpenseId: string,
  cookieHeader: string,
): Promise<SharedExpenseRevision[]> {
  return apiRequest<SharedExpenseRevision[]>(
    `/spaces/${spaceId}/shared-expenses/${sharedExpenseId}/revisions`,
    { method: 'GET', cookieHeader },
  );
}
