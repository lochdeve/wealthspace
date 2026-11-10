import { ApiProperty } from '@nestjs/swagger';
import { SpaceListItemDto } from './space-list-item.dto';

export class SpaceDetailDto extends SpaceListItemDto {
  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
