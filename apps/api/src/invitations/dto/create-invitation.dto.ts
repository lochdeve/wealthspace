import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';

const INVITABLE_ROLES = [MembershipRole.MEMBER, MembershipRole.ADMIN] as const;

export class CreateInvitationDto {
  @ApiProperty({ example: 'friend@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({
    enum: INVITABLE_ROLES,
    default: MembershipRole.MEMBER,
    description: 'Cannot invite as OWNER',
  })
  @IsOptional()
  @IsIn(INVITABLE_ROLES)
  role?: (typeof INVITABLE_ROLES)[number];
}
