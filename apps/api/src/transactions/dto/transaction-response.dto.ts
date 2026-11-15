import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FinancialTransactionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: ['INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_BALANCE'],
  })
  type!: string;

  @ApiProperty({ example: '1500.0000' })
  amount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;

  @ApiProperty({ format: 'uuid' })
  spaceId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  accountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  sourceAccountId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  destinationAccountId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  categoryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  attributedToUserId?: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
