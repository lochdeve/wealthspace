import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSource, SplitMode } from '@prisma/client';

export class SharedExpenseParticipantDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ example: '40.0000' })
  allocatedAmount!: string;

  @ApiPropertyOptional({ example: '33.3300', nullable: true })
  sharePercent?: string | null;
}

export class GeneratedDebtItemDto {
  @ApiProperty({ format: 'uuid' })
  fromUserId!: string;

  @ApiProperty({ format: 'uuid' })
  toUserId!: string;

  @ApiProperty({ example: '40.0000' })
  amount!: string;
}

export class SharedExpenseMemberPaymentResponseDto {
  @ApiProperty({ enum: ['MEMBER'] })
  source!: typeof PaymentSource.MEMBER;

  @ApiProperty({ format: 'uuid' })
  paidByUserId!: string;
}

export class SharedExpenseAccountPaymentResponseDto {
  @ApiProperty({ enum: ['SPACE_ACCOUNT'] })
  source!: typeof PaymentSource.SPACE_ACCOUNT;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;
}

export class MyPersonalCashLinkDto {
  @ApiProperty()
  linked!: boolean;

  @ApiProperty()
  canLink!: boolean;
}

export class SharedExpenseDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ example: '120.0000' })
  totalAmount!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;

  @ApiProperty({ enum: SplitMode })
  splitMode!: SplitMode;

  @ApiProperty({
    oneOf: [
      { $ref: '#/components/schemas/SharedExpenseMemberPaymentResponseDto' },
      { $ref: '#/components/schemas/SharedExpenseAccountPaymentResponseDto' },
    ],
  })
  payment!:
    | SharedExpenseMemberPaymentResponseDto
    | SharedExpenseAccountPaymentResponseDto;

  @ApiProperty({ type: [SharedExpenseParticipantDto] })
  participants!: SharedExpenseParticipantDto[];

  @ApiProperty({ type: [GeneratedDebtItemDto] })
  generatedDebts!: GeneratedDebtItemDto[];

  @ApiProperty({ format: 'uuid' })
  recordedByUserId!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  voidedAt?: string | null;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional({
    description:
      'Present only for the session user when they are the member payer (no personal account id exposed)',
  })
  myPersonalCashLink?: MyPersonalCashLinkDto;
}
