import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateTransactionDto {
  @ApiProperty({ description: 'Current row version from GET' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({
    example: '99.9900',
    description:
      'Must respect type rules (signed opening balance, positive otherwise)',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+(\.\d{1,4})?$/, {
    message: 'amount must be a decimal with up to 4 fractional digits',
  })
  amount?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Category of the same space and compatible transaction type',
  })
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ description: 'Audit note stored on the revision' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
