import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { MembershipRole, MembershipStatus, SpaceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<UserProfileDto> {
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

    return this.toProfile(user);
  }

  async login(dto: LoginDto): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (user === null || user.passwordHash === null) {
      throw this.invalidCredentials();
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw this.invalidCredentials();
    }

    return this.toProfile(user);
  }

  signAccessToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  async getProfileById(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (user === null) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }
    return this.toProfile(user);
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }

  private toProfile(user: {
    id: string;
    email: string;
    displayName: string;
    timezone: string;
    personalSpaceId: string;
  }): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      personalSpaceId: user.personalSpaceId,
    };
  }
}
