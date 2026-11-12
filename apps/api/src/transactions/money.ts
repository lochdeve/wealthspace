import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const SIGNED_MONEY_PATTERN = /^-?\d+(\.\d{1,4})?$/;
const POSITIVE_MONEY_PATTERN = /^\d+(\.\d{1,4})?$/;

export function parseSignedMoneyAmount(
  raw: string,
  field = 'amount',
): Prisma.Decimal {
  if (!SIGNED_MONEY_PATTERN.test(raw)) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_AMOUNT',
      message: `${field} must be a decimal with up to 4 fractional digits`,
    });
  }
  return new Prisma.Decimal(raw);
}

export function parsePositiveMoneyAmount(
  raw: string,
  field = 'amount',
): Prisma.Decimal {
  if (!POSITIVE_MONEY_PATTERN.test(raw)) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_AMOUNT',
      message: `${field} must be a positive decimal with up to 4 fractional digits`,
    });
  }
  const value = new Prisma.Decimal(raw);
  if (value.lte(0)) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_AMOUNT',
      message: `${field} must be greater than zero`,
    });
  }
  return value;
}

export function formatTransactionAmount(value: Prisma.Decimal): string {
  return value.toFixed(4);
}
