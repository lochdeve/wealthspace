import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus, MembershipRole } from '@prisma/client';

export class InvitationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  spaceId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: MembershipRole })
  role!: MembershipRole;

  @ApiProperty({ enum: InvitationStatus })
  status!: InvitationStatus;

  @ApiProperty({ format: 'uuid' })
  invitedByUserId!: string;

  @ApiProperty({ nullable: true, format: 'date-time' })
  expiresAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  /** Present on GET /invitations (inbox) for invitee UX. */
  @ApiPropertyOptional()
  spaceName?: string;

  @ApiPropertyOptional()
  invitedByDisplayName?: string;
}
