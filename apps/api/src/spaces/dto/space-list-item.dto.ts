import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole, SpaceType } from '@prisma/client';

export class SpaceListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SpaceType })
  type!: SpaceType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, minLength: 3, maxLength: 3 })
  displayCurrency!: string | null;

  @ApiProperty({
    enum: MembershipRole,
    description: 'Caller membership in this space',
  })
  role!: MembershipRole;

  @ApiProperty({ format: 'date-time' })
  joinedAt!: string;
}
