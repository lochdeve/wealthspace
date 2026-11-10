import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  MembershipRole,
  MembershipStatus,
  type SpaceInvitation,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import { DEFAULT_INVITATION_TTL_DAYS } from './invitations.constants';
import type { CreateInvitationDto } from './dto/create-invitation.dto';
import type { InvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
  ) {}

  async createForSpace(
    userId: string,
    spaceId: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationDto> {
    const membership = await this.spacesService.requireActiveMembership(
      userId,
      spaceId,
    );
    this.spacesService.assertSharedSpaceManagement(membership);

    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (inviter === null) {
      throw this.invitationNotFound();
    }

    const email = dto.email;
    if (email === inviter.email) {
      throw new ConflictException({
        statusCode: 409,
        code: 'CANNOT_INVITE_SELF',
        message: 'You cannot invite your own email address',
      });
    }

    const existingMember = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: {
            spaceId,
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    });
    if (existingMember !== null && existingMember.memberships.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        code: 'INVITEE_ALREADY_MEMBER',
        message: 'User is already an active member of this space',
      });
    }

    const pending = await this.prisma.spaceInvitation.findFirst({
      where: {
        spaceId,
        email,
        status: InvitationStatus.PENDING,
      },
    });
    if (pending !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'INVITATION_ALREADY_PENDING',
        message: 'A pending invitation already exists for this email',
      });
    }

    const expiresAt = this.defaultExpiresAt();
    const role = dto.role ?? MembershipRole.MEMBER;

    const invitation = await this.prisma.spaceInvitation.create({
      data: {
        id: randomUUID(),
        spaceId,
        email,
        role,
        status: InvitationStatus.PENDING,
        invitedByUserId: userId,
        expiresAt,
      },
    });

    return this.toDto(invitation);
  }

  async listPendingForSpace(
    userId: string,
    spaceId: string,
  ): Promise<InvitationDto[]> {
    const membership = await this.spacesService.requireActiveMembership(
      userId,
      spaceId,
    );
    this.spacesService.assertSharedSpaceManagement(membership);

    const invitations = await this.prisma.spaceInvitation.findMany({
      where: {
        spaceId,
        status: InvitationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((row) => this.toDto(row));
  }

  async listPendingForUser(userId: string): Promise<InvitationDto[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      return [];
    }

    const now = new Date();
    const invitations = await this.prisma.spaceInvitation.findMany({
      where: {
        email: user.email,
        status: InvitationStatus.PENDING,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((row) => this.toDto(row));
  }

  async accept(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.loadInvitationForUserAction(
      userId,
      invitationId,
    );
    await this.assertInvitationActionable(invitation);

    const existingActive = await this.prisma.spaceMembership.findFirst({
      where: {
        spaceId: invitation.spaceId,
        userId,
        status: MembershipStatus.ACTIVE,
      },
    });
    if (existingActive !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_MEMBER',
        message: 'You are already an active member of this space',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.spaceInvitation.updateMany({
        where: {
          id: invitationId,
          status: InvitationStatus.PENDING,
        },
        data: { status: InvitationStatus.ACCEPTED },
      });
      if (updated.count !== 1) {
        throw this.invitationNotFound();
      }

      await tx.spaceMembership.create({
        data: {
          id: randomUUID(),
          spaceId: invitation.spaceId,
          userId,
          role: invitation.role,
          status: MembershipStatus.ACTIVE,
        },
      });
    });
  }

  async reject(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.loadInvitationForUserAction(
      userId,
      invitationId,
    );
    await this.assertInvitationActionable(invitation);

    const updated = await this.prisma.spaceInvitation.updateMany({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.REJECTED },
    });
    if (updated.count !== 1) {
      throw this.invitationNotFound();
    }
  }

  async revoke(
    userId: string,
    spaceId: string,
    invitationId: string,
  ): Promise<void> {
    const membership = await this.spacesService.requireActiveMembership(
      userId,
      spaceId,
    );
    this.spacesService.assertSharedSpaceManagement(membership);

    const updated = await this.prisma.spaceInvitation.updateMany({
      where: {
        id: invitationId,
        spaceId,
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.REVOKED },
    });
    if (updated.count !== 1) {
      throw this.invitationNotFound();
    }
  }

  private async loadInvitationForUserAction(
    userId: string,
    invitationId: string,
  ): Promise<SpaceInvitation> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      throw this.invitationNotFound();
    }

    const invitation = await this.prisma.spaceInvitation.findUnique({
      where: { id: invitationId },
    });
    if (invitation === null || invitation.email !== user.email) {
      throw this.invitationNotFound();
    }
    return invitation;
  }

  private async assertInvitationActionable(
    invitation: SpaceInvitation,
  ): Promise<void> {
    if (invitation.status !== InvitationStatus.PENDING) {
      throw this.invitationNotFound();
    }
    if (this.isExpired(invitation)) {
      await this.prisma.spaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new ConflictException({
        statusCode: 409,
        code: 'INVITATION_EXPIRED',
        message: 'Invitation has expired',
      });
    }
  }

  private isExpired(invitation: SpaceInvitation): boolean {
    if (invitation.expiresAt === null) {
      return false;
    }
    return invitation.expiresAt.getTime() <= Date.now();
  }

  private defaultExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + DEFAULT_INVITATION_TTL_DAYS);
    return expiresAt;
  }

  private toDto(invitation: SpaceInvitation): InvitationDto {
    return {
      id: invitation.id,
      spaceId: invitation.spaceId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedByUserId: invitation.invitedByUserId,
      expiresAt:
        invitation.expiresAt === null
          ? null
          : invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  private invitationNotFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      code: 'INVITATION_NOT_FOUND',
      message: 'Invitation not found',
    });
  }
}
