import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/** Interval [joinedAt, leftAt) — same rule as settlement triggers in the database. */
export async function assertUserMemberAt(
  prisma: PrismaService,
  spaceId: string,
  userId: string,
  at: Date,
  code: 'PARTICIPANT_NOT_MEMBER' | 'PAYER_NOT_MEMBER',
): Promise<void> {
  const rows = await prisma.spaceMembership.findMany({
    where: {
      spaceId,
      userId,
      joinedAt: { lte: at },
    },
    select: { leftAt: true },
  });

  const covered = rows.some((m) => m.leftAt === null || at < m.leftAt);
  if (!covered) {
    const prefix =
      code === 'PAYER_NOT_MEMBER' ? 'Payer was' : 'Participant was';
    throw new BadRequestException({
      statusCode: 400,
      code,
      message: `${prefix} not a member of the space at occurredAt`,
    });
  }
}

export async function requireUserDisplayName(
  prisma: PrismaService,
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  if (user === null) {
    throw new NotFoundException({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  }
  return user.displayName;
}
