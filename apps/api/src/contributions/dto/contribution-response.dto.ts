import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContributionResponseDto {
  @ApiProperty({ format: 'uuid', description: 'SHARED INCOME transaction id' })
  sharedIncomeTransactionId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Present when personalAccountId was sent (P-06)',
  })
  contributionGroupId?: string;

  @ApiProperty({ format: 'uuid' })
  sharedAccountId!: string;

  @ApiProperty({ example: '100.0000' })
  amount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Contributor when personal leg was linked (P-05)',
  })
  attributedToUserId?: string;

  @ApiProperty()
  personalLegLinked!: boolean;
}
