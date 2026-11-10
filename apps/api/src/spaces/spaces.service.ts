import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  type Space,
  type SpaceMembership,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SpaceListItemDto } from './dto/space-list-item.dto';
import type { SpaceDetailDto } from './dto/space-detail.dto';

export type ActiveSpaceMembership = SpaceMembership & { space: Space };

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveSpacesForUser(userId: string): Promise<SpaceListItemDto[]> {
    const memberships = await this.prisma.spaceMembership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
      },
      include: { space: true },
      orderBy: [{ space: { type: 'asc' } }, { space: { name: 'asc' } }],
    });

    return memberships.map((membership) =>
      this.toListItem(membership.space, membership.role, membership.joinedAt),
    );
  }

  async getSpaceForActiveMember(
    userId: string,
    spaceId: string,
  ): Promise<SpaceDetailDto> {
    const membership = await this.findActiveMembership(userId, spaceId);
    if (membership === null) {
      throw this.spaceNotFound();
    }
    return this.toDetail(
      membership.space,
      membership.role,
      membership.joinedAt,
    );
  }

  async requireActiveMembership(
    userId: string,
    spaceId: string,
  ): Promise<ActiveSpaceMembership> {
    const membership = await this.findActiveMembership(userId, spaceId);
    if (membership === null) {
      throw this.spaceNotFound();
    }
    return membership;
  }

  private async findActiveMembership(
    userId: string,
    spaceId: string,
  ): Promise<ActiveSpaceMembership | null> {
    return this.prisma.spaceMembership.findFirst({
      where: {
        userId,
        spaceId,
        status: MembershipStatus.ACTIVE,
      },
      include: { space: true },
    });
  }

  private toListItem(
    space: Space,
    role: MembershipRole,
    joinedAt: Date,
  ): SpaceListItemDto {
    return {
      id: space.id,
      type: space.type,
      name: space.name,
      displayCurrency: space.displayCurrency,
      role,
      joinedAt: joinedAt.toISOString(),
    };
  }

  private toDetail(
    space: Space,
    role: MembershipRole,
    joinedAt: Date,
  ): SpaceDetailDto {
    return {
      ...this.toListItem(space, role, joinedAt),
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
    };
  }

  private spaceNotFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      code: 'SPACE_NOT_FOUND',
      message: 'Space not found',
    });
  }
}
