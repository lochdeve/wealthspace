import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConsumptionAmountByCurrencyDto {
  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '123.4500' })
  amount!: string;
}

export class ConsumptionByCategoryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Unset when consumption has no category',
  })
  categoryId?: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '45.0000' })
  amount!: string;
}

export class ConsumptionReportDto {
  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 11 })
  month!: number;

  @ApiProperty({ example: 'Europe/Madrid' })
  timezone!: string;

  @ApiProperty({
    example: '2026-11-01',
    description: 'Local calendar start of month in timezone',
  })
  periodStartLocal!: string;

  @ApiProperty({
    example: '2026-11-30',
    description: 'Local calendar end of month in timezone',
  })
  periodEndLocal!: string;

  @ApiProperty({ type: ConsumptionAmountByCurrencyDto, isArray: true })
  totalsByCurrency!: ConsumptionAmountByCurrencyDto[];

  @ApiProperty({ type: ConsumptionByCategoryDto, isArray: true })
  byCategory!: ConsumptionByCategoryDto[];
}