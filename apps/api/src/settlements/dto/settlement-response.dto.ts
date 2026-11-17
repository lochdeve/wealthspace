import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettlementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fromUserId!: string;

  @ApiProperty({ format: 'uuid' })
  toUserId!: string;

  @ApiProperty({ example: '15.0000' })
  amount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;

  @ApiProperty({ format: 'uuid' })
  recordedByUserId!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  voidedAt?: string | null;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'P-11 e.g. SETTLEMENT_EXCEEDS_PENDING_DEBT',
  })
  warnings?: string[];
}
