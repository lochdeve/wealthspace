import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const MONEY_INPUT = /^\d+(\.\d{1,4})?$/;

export class CreateBudgetDto {
  @ApiProperty({ example: 'Groceries' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '500.00' })
  @IsString()
  @Matches(MONEY_INPUT, {
    message: 'amount must be a positive decimal with up to 4 fractional digits',
  })
  amount!: string;

  @ApiProperty({ example: 'EUR' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter ISO 4217 code (e.g. EUR)',
  })
  currency!: string;

  @ApiProperty({
    example: '2026-11-01',
    description: 'Inclusive period start (calendar date)',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  periodStart!: string;

  @ApiProperty({
    example: '2026-11-30',
    description: 'Inclusive period end (calendar date)',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  periodEnd!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}