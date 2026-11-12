import type { CategoryType, TransactionType } from '@/lib/api/finance-types';

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  OPENING_BALANCE: 'Saldo inicial',
};

export function transactionTypeLabel(type: TransactionType): string {
  return TRANSACTION_TYPE_LABELS[type];
}

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
};

export function categoryTypeLabel(type: CategoryType): string {
  return CATEGORY_TYPE_LABELS[type];
}
