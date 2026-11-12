import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';

/** Active member in a space (roster for shared spaces). */
export class SpaceMemberDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: MembershipRole })
  role!: MembershipRole;

  @ApiProperty({ format: 'date-time' })
  joinedAt!: string;
}
