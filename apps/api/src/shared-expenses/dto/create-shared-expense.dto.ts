import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitMode } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const MONEY_INPUT = /^\d+(\.\d{1,4})?$/;
const PERCENT_INPUT = /^\d+(\.\d{1,2})?$/;

export class SharedExpenseMemberPaymentDto {
  @ApiProperty({ enum: ['MEMBER'] })
  @IsIn(['MEMBER'])
  source!: 'MEMBER';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  paidByUserId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Optional personal account (PERSONAL space) when the actor is the payer',
  })
  @IsOptional()
  @IsUUID()
  personalAccountId?: string;
}

export class SharedExpenseAccountPaymentDto {
  @ApiProperty({ enum: ['SPACE_ACCOUNT'] })
  @IsIn(['SPACE_ACCOUNT'])
  source!: 'SPACE_ACCOUNT';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;
}

export class SplitEqualDto {
  @ApiProperty({ enum: [SplitMode.EQUAL] })
  @IsEnum(SplitMode)
  mode!: typeof SplitMode.EQUAL;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantUserIds!: string[];
}

export class SplitShareDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export class SplitPercentageShareDto extends SplitShareDto {
  @ApiProperty({ example: '33.33' })
  @IsString()
  @Matches(PERCENT_INPUT, {
    message: 'percent must have up to 2 decimal places',
  })
  percent!: string;
}

export class SplitFixedShareDto extends SplitShareDto {
  @ApiProperty({ example: '40.00' })
  @IsString()
  @Matches(MONEY_INPUT, {
    message: 'amount must be a positive decimal with up to 4 fractional digits',
  })
  amount!: string;
}

export class SplitPercentageDto {
  @ApiProperty({ enum: [SplitMode.PERCENTAGE] })
  @IsEnum(SplitMode)
  mode!: typeof SplitMode.PERCENTAGE;

  @ApiProperty({ type: [SplitPercentageShareDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitPercentageShareDto)
  shares!: SplitPercentageShareDto[];
}

export class SplitFixedAmountDto {
  @ApiProperty({ enum: [SplitMode.FIXED_AMOUNT] })
  @IsEnum(SplitMode)
  mode!: typeof SplitMode.FIXED_AMOUNT;

  @ApiProperty({ type: [SplitFixedShareDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitFixedShareDto)
  shares!: SplitFixedShareDto[];
}

export class CreateSharedExpenseDto {
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '120.00' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(MONEY_INPUT, {
    message:
      'totalAmount must be a positive decimal with up to 4 fractional digits',
  })
  totalAmount!: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => Object, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'source',
      subTypes: [
        { value: SharedExpenseMemberPaymentDto, name: 'MEMBER' },
        { value: SharedExpenseAccountPaymentDto, name: 'SPACE_ACCOUNT' },
      ],
    },
  })
  payment!: SharedExpenseMemberPaymentDto | SharedExpenseAccountPaymentDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => Object, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'mode',
      subTypes: [
        { value: SplitEqualDto, name: SplitMode.EQUAL },
        { value: SplitPercentageDto, name: SplitMode.PERCENTAGE },
        { value: SplitFixedAmountDto, name: SplitMode.FIXED_AMOUNT },
      ],
    },
  })
  split!: SplitEqualDto | SplitPercentageDto | SplitFixedAmountDto;
}
