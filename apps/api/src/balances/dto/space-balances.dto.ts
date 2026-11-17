import { ApiProperty } from '@nestjs/swagger';

export class PairDebtDto {
  @ApiProperty({ format: 'uuid' })
  fromUserId!: string;

  @ApiProperty({ format: 'uuid' })
  toUserId!: string;

  @ApiProperty({ example: '25.0000' })
  amount!: string;
}

export class MemberNetDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: '65.0000' })
  net!: string;
}

export class CurrencyBalancesDto {
  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ type: [PairDebtDto] })
  debts!: PairDebtDto[];

  @ApiProperty({ type: [MemberNetDto] })
  members!: MemberNetDto[];
}

export class SpaceBalancesDto {
  @ApiProperty({ type: [CurrencyBalancesDto] })
  currencies!: CurrencyBalancesDto[];
}
