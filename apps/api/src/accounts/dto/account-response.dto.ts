import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({
    description: 'Computed on read from transactions (4 decimal places)',
    example: '1250.0000',
  })
  balance!: string;

  @ApiPropertyOptional({
    description: 'Set when the account is archived',
    format: 'date-time',
  })
  archivedAt?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AccountDetailDto extends AccountListItemDto {}
