import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export function assertSettlementRegisterAllowed(
  role: MembershipRole,
  actorUserId: string,
  fromUserId: string,
  toUserId: string,
): void {
  if (role === MembershipRole.OWNER || role === MembershipRole.ADMIN) {
    return;
  }
  if (actorUserId === fromUserId || actorUserId === toUserId) {
    return;
  }
  throw new ForbiddenException({
    statusCode: 403,
    code: 'SETTLEMENT_FORBIDDEN',
    message: 'You cannot register this settlement',
  });
}

export function assertSettlementVoidAllowed(
  role: MembershipRole,
  actorUserId: string,
  settlement: {
    recordedByUserId: string;
    fromUserId: string;
    toUserId: string;
  },
): void {
  if (role === MembershipRole.OWNER || role === MembershipRole.ADMIN) {
    return;
  }
  if (
    actorUserId === settlement.recordedByUserId ||
    actorUserId === settlement.fromUserId ||
    actorUserId === settlement.toUserId
  ) {
    return;
  }
  throw new ForbiddenException({
    statusCode: 403,
    code: 'SETTLEMENT_FORBIDDEN',
    message: 'You cannot void this settlement',
  });
}
