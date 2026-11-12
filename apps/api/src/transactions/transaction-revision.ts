import type { FinancialTransaction, Prisma } from '@prisma/client';

export function buildTransactionSnapshot(
  tx: FinancialTransaction,
): Prisma.InputJsonValue {
  return {
    schemaVersion: 1,
    id: tx.id,
    spaceId: tx.spaceId,
    type: tx.type,
    amount: tx.amount.toFixed(4),
    currency: tx.currency,
    description: tx.description,
    occurredAt: tx.occurredAt.toISOString(),
    accountId: tx.accountId,
    sourceAccountId: tx.sourceAccountId,
    destinationAccountId: tx.destinationAccountId,
    categoryId: tx.categoryId,
    attributedToUserId: tx.attributedToUserId,
    version: tx.version,
  };
}
