import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class LinkPersonalPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  personalAccountId!: string;

  @ApiProperty({ description: 'Current row version from GET' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}