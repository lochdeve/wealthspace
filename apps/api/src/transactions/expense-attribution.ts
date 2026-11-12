import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { ActiveSpaceMembership } from '../spaces/spaces.service';

export async function assertSharedExpenseAttribution(
  prisma: PrismaService,
  actor: ActiveSpaceMembership,
  attributedToUserId: string,
): Promise<void> {
  if (
    actor.role === MembershipRole.MEMBER &&
    attributedToUserId !== actor.userId
  ) {
    throw new ForbiddenException({
      statusCode: 403,
      code: 'ATTRIBUTION_NOT_ALLOWED',
      message: 'Members can only attribute expenses to themselves',
    });
  }

  const target = await prisma.spaceMembership.findFirst({
    where: {
      spaceId: actor.spaceId,
      userId: attributedToUserId,
      status: MembershipStatus.ACTIVE,
    },
  });
  if (target === null) {
    throw new NotFoundException({
      statusCode: 404,
      code: 'ATTRIBUTEE_NOT_ACTIVE_MEMBER',
      message: 'Attributed user is not an active member of this space',
    });
  }
}
