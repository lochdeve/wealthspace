import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ACTIVE member (ADMIN or MEMBER) who will become OWNER',
  })
  @IsUUID()
  newOwnerUserId!: string;
}
