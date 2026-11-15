import type { ExpenseParticipant, Prisma, SharedExpense } from '@prisma/client';
import { PaymentSource } from '@prisma/client';

export function buildSharedExpenseSnapshot(
  row: SharedExpense & { participants: ExpenseParticipant[] },
  options?: { accountId?: string | null },
): Prisma.InputJsonValue {
  const payment =
    row.paymentSource === PaymentSource.MEMBER
      ? {
          source: 'MEMBER' as const,
          paidByUserId: row.paidByUserId,
        }
      : {
          source: 'SPACE_ACCOUNT' as const,
          accountId: options?.accountId ?? null,
        };

  return {
    schemaVersion: 1,
    id: row.id,
    spaceId: row.spaceId,
    totalAmount: row.totalAmount.toFixed(4),
    currency: row.currency,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    splitMode: row.splitMode,
    payment,
    categoryId: row.categoryId,
    recordedByUserId: row.recordedByUserId,
    version: row.version,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    participants: row.participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayNameSnapshot,
      allocatedAmount: p.allocatedAmount.toFixed(4),
      sharePercent: p.sharePercent !== null ? p.sharePercent.toFixed(4) : null,
    })),
  };
}
