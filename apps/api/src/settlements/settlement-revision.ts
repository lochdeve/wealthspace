import type { Prisma, Settlement } from '@prisma/client';

export function buildSettlementSnapshot(
  row: Settlement,
): Prisma.InputJsonValue {
  return {
    schemaVersion: 1,
    id: row.id,
    spaceId: row.spaceId,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    amount: row.amount.toFixed(4),
    currency: row.currency,
    occurredAt: row.occurredAt.toISOString(),
    recordedByUserId: row.recordedByUserId,
    version: row.version,
    voidedAt: row.voidedAt?.toISOString() ?? null,
  };
}
