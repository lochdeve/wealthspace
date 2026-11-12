import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateOpeningBalanceDto {
  @ApiProperty({
    example: '1500.0000',
    description: 'Signed amount; zero allowed (4 decimal places max)',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^-?\d+(\.\d{1,4})?$/, {
    message: 'amount must be a decimal with up to 4 fractional digits',
  })
  amount!: string;

  @ApiPropertyOptional({ example: 'Initial balance' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Defaults to now (UTC)',
  })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
