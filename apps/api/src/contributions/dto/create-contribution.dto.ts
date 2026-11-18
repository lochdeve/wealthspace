import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const MONEY_INPUT = /^\d+(\.\d{1,4})?$/;

export class CreateContributionDto {
  @ApiProperty({ format: 'uuid', description: 'SHARED space account receiving funds' })
  @IsUUID()
  sharedAccountId!: string;

  @ApiProperty({ example: '100.00' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Personal account to debit; when set, creates CONTRIBUTION_PAIR (P-06)',
  })
  @IsOptional()
  @IsUUID()
  personalAccountId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}