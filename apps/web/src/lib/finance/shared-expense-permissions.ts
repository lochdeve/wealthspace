import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import type { MembershipRole } from '@/lib/api/space-types';

/** P-09: edit or void allowed for OWNER/ADMIN, recorder, or payer (MEMBER payment). */
export function canMutateSharedExpense(
  actorRole: MembershipRole,
  actorUserId: string,
  expense: Pick<SharedExpenseDetail, 'recordedByUserId' | 'payment'>,
): boolean {
  if (actorRole === 'OWNER' || actorRole === 'ADMIN') {
    return true;
  }
  if (actorUserId === expense.recordedByUserId) {
    return true;
  }
  if (expense.payment.source === 'MEMBER' && actorUserId === expense.payment.paidByUserId) {
    return true;
  }
  return false;
}
