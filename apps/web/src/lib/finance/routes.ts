import type { TransactionType } from '@/lib/api/finance-types';
import { toQueryString } from '@/lib/api/query';

export function spaceTransactionsHref(
  spaceId: string,
  query?: { accountId?: string; type?: TransactionType },
): string {
  return `/spaces/${spaceId}/transactions${toQueryString({
    accountId: query?.accountId,
    type: query?.type,
  })}`;
}

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

export function contributeToAccountHref(spaceId: string, accountId: string): string {
  return `/spaces/${spaceId}/accounts/${accountId}/contribute`;
}
