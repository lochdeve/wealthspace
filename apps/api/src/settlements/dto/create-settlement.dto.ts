import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { PersonalCashFlowDto } from './personal-cash-flow.dto';

const MONEY_INPUT = /^\d+(\.\d{1,4})?$/;

export class CreateSettlementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromUserId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toUserId!: string;

  @ApiProperty({ example: '15.00' })
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
    description:
      'Optional personal account on the actor side (from → out, to → in)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalCashFlowDto)
  personalCashFlow?: PersonalCashFlowDto;
}
