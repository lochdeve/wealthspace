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

export function spaceBalancesHref(spaceId: string): string {
  return `/spaces/${spaceId}/balances`;
}

export function settlementsHref(
  spaceId: string,
  query?: { includeVoided?: boolean; userId?: string; warning?: string },
): string {
  return `/spaces/${spaceId}/settlements${toQueryString({
    includeVoided: query?.includeVoided ? '1' : undefined,
    userId: query?.userId,
    warning: query?.warning,
  })}`;
}

export type RegisterSettlementPrefill = {
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
};

export function registerSettlementHref(
  spaceId: string,
  prefill?: Partial<RegisterSettlementPrefill>,
): string {
  return `/spaces/${spaceId}/settlements/new${toQueryString({
    fromUserId: prefill?.fromUserId,
    toUserId: prefill?.toUserId,
    amount: prefill?.amount,
    currency: prefill?.currency,
  })}`;
}
