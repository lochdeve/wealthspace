import { toQueryString } from '@/lib/api/query';

export function individualExpenseHref(spaceId: string, accountId?: string): string {
  return `/spaces/${spaceId}/expenses/individual/new${toQueryString({ accountId })}`;
}

export function sharedExpensesHref(
  spaceId: string,
  query?: { includeVoided?: boolean },
): string {
  return `/spaces/${spaceId}/expenses${toQueryString({
    includeVoided: query?.includeVoided ? '1' : undefined,
  })}`;
}

export function sharedExpenseHref(spaceId: string): string {
  return `/spaces/${spaceId}/expenses/new`;
}

export function sharedExpenseDetailHref(spaceId: string, expenseId: string): string {
  return `/spaces/${spaceId}/expenses/${expenseId}`;
}
