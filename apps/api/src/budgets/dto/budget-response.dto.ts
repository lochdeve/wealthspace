import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BudgetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '500.0000' })
  amount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '2026-11-01' })
  periodStart!: string;

  @ApiProperty({ example: '2026-11-30' })
  periodEnd!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  categoryId?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}