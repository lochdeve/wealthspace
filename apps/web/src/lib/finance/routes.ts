import { toQueryString } from '@/lib/api/query';

export function individualExpenseHref(spaceId: string, accountId?: string): string {
  return `/spaces/${spaceId}/expenses/individual/new${toQueryString({ accountId })}`;
}
