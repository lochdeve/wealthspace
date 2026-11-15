import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export function assertPayerSelectionAllowed(
  role: MembershipRole,
  actorUserId: string,
  paidByUserId: string,
): void {
  if (role === MembershipRole.MEMBER && paidByUserId !== actorUserId) {
    throw new ForbiddenException({
      statusCode: 403,
      code: 'PAYER_NOT_ALLOWED',
      message: 'Members can only register expenses they paid themselves',
    });
  }
}
