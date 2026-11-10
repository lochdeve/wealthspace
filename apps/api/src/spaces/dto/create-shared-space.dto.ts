import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSharedSpaceDto {
  @ApiProperty({ example: 'Home' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'ISO 4217 code for dashboards/reports in this space',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim().toUpperCase();
    }
    return value;
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'displayCurrency must be a 3-letter ISO 4217 code (e.g. EUR)',
  })
  displayCurrency?: string;
}
