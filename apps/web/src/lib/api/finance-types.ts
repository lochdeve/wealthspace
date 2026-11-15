export type Account = {
  id: string;
  name: string;
  currency: string;
  balance: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  name: string;
  currency: string;
};

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OPENING_BALANCE';

export type FinancialTransaction = {
  id: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description?: string;
  occurredAt: string;
  spaceId: string;
  accountId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  categoryId?: string;
  attributedToUserId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateOpeningBalanceInput = {
  amount: string;
  description?: string;
  occurredAt?: string;
};

export type CreateIncomeInput = {
  accountId: string;
  amount: string;
  description?: string;
  categoryId?: string;
  occurredAt?: string;
};

export type CreateExpenseInput = {
  accountId: string;
  amount: string;
  description?: string;
  categoryId?: string;
  occurredAt?: string;
};

export type CategoryType = 'INCOME' | 'EXPENSE';

export type Category = {
  id: string;
  type: CategoryType;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  parentId?: string;
};

export type CreateTransferInput = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  description?: string;
  occurredAt?: string;
};

/** EXPENSE attributed to a single member in a SHARED space (no split, no debt — P-14). */
export type CreateAttributedExpenseInput = {
  amount: string;
  attributedToUserId: string;
  accountId?: string;
  currency?: string;
  description?: string;
  categoryId?: string;
  occurredAt?: string;
};

export type UpdateTransactionInput = {
  expectedVersion: number;
  description?: string | null;
  occurredAt?: string;
  amount?: string;
  reason?: string;
};

export type ListTransactionsQuery = {
  accountId?: string;
  type?: TransactionType;
  limit?: number;
};
