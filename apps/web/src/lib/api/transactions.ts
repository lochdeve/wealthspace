import { apiRequest } from '@/lib/api/client';
import { toQueryString } from '@/lib/api/query';
import type {
  CreateAttributedExpenseInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateOpeningBalanceInput,
  CreateTransferInput,
  FinancialTransaction,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '@/lib/api/finance-types';

export function listTransactions(
  spaceId: string,
  query: ListTransactionsQuery = {},
): Promise<FinancialTransaction[]> {
  const qs = toQueryString({
    accountId: query.accountId,
    type: query.type,
    limit: query.limit,
  });
  return apiRequest<FinancialTransaction[]>(`/spaces/${spaceId}/transactions${qs}`, {
    method: 'GET',
  });
}

export function listTransactionsWithCookie(
  spaceId: string,
  cookieHeader: string,
  query: ListTransactionsQuery = {},
): Promise<FinancialTransaction[]> {
  const qs = toQueryString({
    accountId: query.accountId,
    type: query.type,
    limit: query.limit,
  });
  return apiRequest<FinancialTransaction[]>(`/spaces/${spaceId}/transactions${qs}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function createOpeningBalance(
  spaceId: string,
  accountId: string,
  data: CreateOpeningBalanceInput,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(
    `/spaces/${spaceId}/accounts/${accountId}/opening-balance`,
    { method: 'POST', body: data },
  );
}

export function createIncome(
  spaceId: string,
  data: CreateIncomeInput,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/income`, {
    method: 'POST',
    body: data,
  });
}

export function createExpense(
  spaceId: string,
  data: CreateExpenseInput,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/expense`, {
    method: 'POST',
    body: data,
  });
}

export function createTransfer(
  spaceId: string,
  data: CreateTransferInput,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/transfer`, {
    method: 'POST',
    body: data,
  });
}

export function getTransaction(
  spaceId: string,
  transactionId: string,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/${transactionId}`, {
    method: 'GET',
  });
}

export function getTransactionWithCookie(
  spaceId: string,
  transactionId: string,
  cookieHeader: string,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/${transactionId}`, {
    method: 'GET',
    cookieHeader,
  });
}

export function updateTransaction(
  spaceId: string,
  transactionId: string,
  data: UpdateTransactionInput,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/${transactionId}`, {
    method: 'PATCH',
    body: data,
  });
}

export function createAttributedExpense(
  spaceId: string,
  data: CreateAttributedExpenseInput,
): Promise<FinancialTransaction> {
  return apiRequest<FinancialTransaction>(`/spaces/${spaceId}/transactions/expense`, {
    method: 'POST',
    body: data,
  });
}
