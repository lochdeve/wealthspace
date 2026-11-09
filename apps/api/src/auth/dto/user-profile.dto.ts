import { ApiProperty } from '@nestjs/swagger';

/** Public user fields returned after register, login, and GET /auth/me. */
export class UserProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ format: 'uuid' })
  personalSpaceId!: string;
}
