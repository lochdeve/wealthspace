import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { MembershipRole, MembershipStatus, SpaceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { RegisterResponseDto } from './dto/register-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const email = dto.email;
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered',
      });
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const spaceId = randomUUID();
    const userId = randomUUID();
    const spaceName = dto.displayName.length > 0 ? dto.displayName : 'Personal';

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.space.create({
        data: {
          id: spaceId,
          type: SpaceType.PERSONAL,
          name: spaceName,
        },
      });

      const created = await tx.user.create({
        data: {
          id: userId,
          email,
          displayName: dto.displayName,
          passwordHash,
          timezone: dto.timezone,
          personalSpaceId: spaceId,
        },
      });

      await tx.spaceMembership.create({
        data: {
          spaceId: spaceId,
          userId: userId,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      return created;
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      personalSpaceId: user.personalSpaceId,
    };
  }
}
