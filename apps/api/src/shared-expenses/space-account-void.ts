import { ConflictException, NotFoundException } from '@nestjs/common';
import { PaymentSource, type Prisma } from '@prisma/client';

/**
 * Logical void for a shared expense. When payment is SPACE_ACCOUNT, voids the
 * linked payment transaction in the same DB transaction (option B, P-13).
 */
export async function voidSharedExpenseInTransaction(
  tx: Prisma.TransactionClient,
  params: {
    spaceId: string;
    sharedExpenseId: string;
    voidedByUserId: string;
    voidedAt: Date;
  },
): Promise<void> {
  const shared = await tx.sharedExpense.findFirst({
    where: { id: params.sharedExpenseId, spaceId: params.spaceId },
  });
  if (shared === null) {
    throw new NotFoundException({
      statusCode: 404,
      code: 'SHARED_EXPENSE_NOT_FOUND',
      message: 'Shared expense not found',
    });
  }
  if (shared.voidedAt !== null) {
    throw new ConflictException({
      statusCode: 409,
      code: 'ALREADY_VOIDED',
      message: 'Shared expense is already voided',
    });
  }

  await tx.sharedExpense.update({
    where: { id: shared.id },
    data: {
      voidedAt: params.voidedAt,
      voidedByUserId: params.voidedByUserId,
    },
  });

  if (
    shared.paymentSource === PaymentSource.SPACE_ACCOUNT &&
    shared.financialTransactionId !== null
  ) {
    await tx.financialTransaction.updateMany({
      where: {
        id: shared.financialTransactionId,
        spaceId: params.spaceId,
        voidedAt: null,
      },
      data: {
        voidedAt: params.voidedAt,
        voidedByUserId: params.voidedByUserId,
      },
    });
  }
}
