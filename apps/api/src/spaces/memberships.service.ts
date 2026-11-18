import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, MembershipStatus, SpaceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SpaceMemberDto } from './dto/space-member.dto';
import type { ActiveSpaceMembership } from './spaces.service';
import { SpacesService } from './spaces.service';

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
  ) {}

  async listActiveMembers(
    userId: string,
    spaceId: string,
  ): Promise<SpaceMemberDto[]> {
    const membership = await this.spacesService.requireActiveMembership(
      userId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const rows = await this.prisma.spaceMembership.findMany({
      where: {
        spaceId,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return rows.map((row) => ({
      userId: row.user.id,
      displayName: row.user.displayName,
      email: row.user.email,
      role: row.role,
      joinedAt: row.joinedAt.toISOString(),
    }));
  }

  async leaveSpace(userId: string, spaceId: string): Promise<void> {
    const membership = await this.spacesService.requireActiveMembership(
      userId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    if (membership.role === MembershipRole.OWNER) {
      const ownerCount = await this.countActiveOwners(spaceId);
      if (ownerCount <= 1) {
        throw new ConflictException({
          statusCode: 409,
          code: 'CANNOT_LEAVE_AS_SOLE_OWNER',
          message:
            'Cannot leave while you are the only active owner (transfer ownership first)',
        });
      }
    }

    await this.endMembership(membership.id, MembershipStatus.LEFT);
  }

  async removeMember(
    actorUserId: string,
    spaceId: string,
    targetUserId: string,
  ): Promise<void> {
    const actorMembership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(actorMembership);
    this.spacesService.assertSharedSpaceManagement(actorMembership);

    if (targetUserId === actorUserId) {
      throw new ConflictException({
        statusCode: 409,
        code: 'USE_LEAVE_INSTEAD',
        message: 'Use POST /spaces/:spaceId/membership/leave to leave yourself',
      });
    }

    const target = await this.prisma.spaceMembership.findFirst({
      where: {
        spaceId,
        userId: targetUserId,
        status: MembershipStatus.ACTIVE,
      },
    });
    if (target === null) {
      throw this.memberNotFound();
    }

    if (actorMembership.role === MembershipRole.ADMIN) {
      if (
        target.role === MembershipRole.OWNER ||
        target.role === MembershipRole.ADMIN
      ) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'INSUFFICIENT_ROLE',
          message: 'Admins can only remove members',
        });
      }
    }

    if (target.role === MembershipRole.OWNER) {
      const ownerCount = await this.countActiveOwners(spaceId);
      if (ownerCount <= 1) {
        throw new ConflictException({
          statusCode: 409,
          code: 'CANNOT_REMOVE_SOLE_OWNER',
          message: 'Cannot remove the only active owner of the space',
        });
      }
    }

    await this.endMembership(target.id, MembershipStatus.REMOVED);
  }

  async transferOwnership(
    actorUserId: string,
    spaceId: string,
    newOwnerUserId: string,
  ): Promise<void> {
    const actor = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(actor);

    if (actor.role !== MembershipRole.OWNER) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'INSUFFICIENT_ROLE',
        message: 'Only the owner can transfer ownership',
      });
    }

    if (newOwnerUserId === actorUserId) {
      throw new ConflictException({
        statusCode: 409,
        code: 'TRANSFER_TO_SELF',
        message: 'You are already the owner',
      });
    }

    const target = await this.prisma.spaceMembership.findFirst({
      where: {
        spaceId,
        userId: newOwnerUserId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (target === null) {
      throw this.memberNotFound();
    }

    if (
      target.role !== MembershipRole.ADMIN &&
      target.role !== MembershipRole.MEMBER
    ) {
      throw new ConflictException({
        statusCode: 409,
        code: 'TRANSFER_TARGET_NOT_ELIGIBLE',
        message: 'New owner must be an active admin or member',
      });
    }

    const at = new Date();

    await this.prisma.$transaction([
      this.prisma.spaceMembership.update({
        where: { id: actor.id },
        data: { role: MembershipRole.ADMIN },
      }),
      this.prisma.spaceMembership.update({
        where: { id: target.id },
        data: { role: MembershipRole.OWNER },
      }),
    ]);

    this.logger.log(
      JSON.stringify({
        event: 'ownership_transferred',
        spaceId,
        fromUserId: actorUserId,
        toUserId: newOwnerUserId,
        transferredAt: at.toISOString(),
      }),
    );
  }

  private assertSharedSpace(membership: ActiveSpaceMembership): void {
    if (membership.space.type !== SpaceType.SHARED) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'SPACE_NOT_SHARED',
        message: 'Membership lifecycle applies only to shared spaces',
      });
    }
  }

  private async countActiveOwners(spaceId: string): Promise<number> {
    return this.prisma.spaceMembership.count({
      where: {
        spaceId,
        status: MembershipStatus.ACTIVE,
        role: MembershipRole.OWNER,
      },
    });
  }

  private async endMembership(
    membershipId: string,
    status: MembershipStatus,
  ): Promise<void> {
    const leftAt = new Date();
    const updated = await this.prisma.spaceMembership.updateMany({
      where: {
        id: membershipId,
        status: MembershipStatus.ACTIVE,
      },
      data: {
        status,
        leftAt,
      },
    });
    if (updated.count !== 1) {
      throw this.memberNotFound();
    }
  }

  private memberNotFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      code: 'MEMBER_NOT_FOUND',
      message: 'Active member not found in this space',
    });
  }
}
