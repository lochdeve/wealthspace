import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type { Account, CreateAccountInput } from '@/lib/api/finance-types';

export function listAccounts(
  spaceId: string,
  options?: { includeArchived?: boolean },
): Promise<Account[]> {
  const qs = toQueryString({ includeArchived: options?.includeArchived });
  return apiRequest<Account[]>(`/spaces/${spaceId}/accounts${qs}`, { method: 'GET' });
}

export function listAccountsWithCookie(
  spaceId: string,
  cookieHeader: string,
  options?: { includeArchived?: boolean },
): Promise<Account[]> {
  const qs = toQueryString({ includeArchived: options?.includeArchived });
  return apiRequest<Account[]>(`/spaces/${spaceId}/accounts${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function createAccount(spaceId: string, data: CreateAccountInput): Promise<Account> {
  return apiRequest<Account>(`/spaces/${spaceId}/accounts`, {
    method: 'POST',
    body: data,
  });
}

export function getAccount(spaceId: string, accountId: string): Promise<Account> {
  return apiRequest<Account>(`/spaces/${spaceId}/accounts/${accountId}`, { method: 'GET' });
}

export function getAccountWithCookie(
  spaceId: string,
  accountId: string,
  cookieHeader: string,
): Promise<Account> {
  return apiRequest<Account>(`/spaces/${spaceId}/accounts/${accountId}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function archiveAccount(spaceId: string, accountId: string): Promise<void> {
  return apiRequest<void>(`/spaces/${spaceId}/accounts/${accountId}/archive`, { method: 'POST' });
}
