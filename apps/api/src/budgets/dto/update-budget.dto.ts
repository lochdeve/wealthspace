import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const MONEY_INPUT = /^\d+(\.\d{1,4})?$/;

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 'Groceries' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @IsString()
  @Matches(MONEY_INPUT, {
    message: 'amount must be a positive decimal with up to 4 fractional digits',
  })
  amount?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter ISO 4217 code (e.g. EUR)',
  })
  currency?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  periodStart?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  periodEnd?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Omit to leave unchanged; null clears category',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  categoryId?: string | null;
}
