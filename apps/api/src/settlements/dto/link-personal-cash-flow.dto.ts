import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class LinkPersonalCashFlowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ description: 'Current row version from GET/list' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
