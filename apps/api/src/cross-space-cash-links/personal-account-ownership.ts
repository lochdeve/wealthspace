import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export type PersonalAccountRow = {
  id: string;
  spaceId: string;
  currency: string;
  archivedAt: Date | null;
};

export function validatePersonalAccountForOwner(params: {
  personalSpaceId: string;
  account: PersonalAccountRow | null;
  requiredCurrency?: string;
}): PersonalAccountRow {
  const { account, personalSpaceId, requiredCurrency } = params;

  if (account === null) {
    throw new NotFoundException({
      statusCode: 404,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found',
    });
  }

  if (account.spaceId !== personalSpaceId) {
    throw new ForbiddenException({
      statusCode: 403,
      code: 'PERSONAL_ACCOUNT_NOT_OWNED',
      message: 'Account is not in your personal space',
    });
  }

  if (account.archivedAt !== null) {
    throw new ConflictException({
      statusCode: 409,
      code: 'ACCOUNT_ARCHIVED',
      message: 'Cannot post to an archived account',
    });
  }

  if (requiredCurrency !== undefined && account.currency !== requiredCurrency) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'CROSS_SPACE_CURRENCY_MISMATCH',
      message: 'Personal account currency does not match operation currency',
    });
  }

  return account;
}
