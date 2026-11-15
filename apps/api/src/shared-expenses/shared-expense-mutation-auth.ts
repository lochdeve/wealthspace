import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export function assertSharedExpenseMutationAllowed(
  role: MembershipRole,
  actorUserId: string,
  expense: {
    recordedByUserId: string;
    paidByUserId: string | null;
  },
): void {
  if (role === MembershipRole.OWNER || role === MembershipRole.ADMIN) {
    return;
  }
  if (actorUserId === expense.recordedByUserId) {
    return;
  }
  if (expense.paidByUserId !== null && actorUserId === expense.paidByUserId) {
    return;
  }
  throw new ForbiddenException({
    statusCode: 403,
    code: 'SHARED_EXPENSE_EDIT_FORBIDDEN',
    message: 'You cannot edit or void this shared expense',
  });
}
