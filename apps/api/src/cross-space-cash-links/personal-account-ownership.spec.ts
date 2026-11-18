import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { validatePersonalAccountForOwner } from './personal-account-ownership';

const personalSpaceId = '00000000-0000-4000-8000-000000000001';
const otherSpaceId = '00000000-0000-4000-8000-000000000002';

describe('validatePersonalAccountForOwner', () => {
  it('returns account when owned and currency matches', () => {
    const account = {
      id: 'acc-1',
      spaceId: personalSpaceId,
      currency: 'EUR',
      archivedAt: null,
    };
    expect(
      validatePersonalAccountForOwner({
        personalSpaceId,
        account,
        requiredCurrency: 'EUR',
      }),
    ).toBe(account);
  });

  it('throws ACCOUNT_NOT_FOUND when account is null', () => {
    expect(() =>
      validatePersonalAccountForOwner({
        personalSpaceId,
        account: null,
      }),
    ).toThrow(NotFoundException);
  });

  it('throws PERSONAL_ACCOUNT_NOT_OWNED when account is in another space', () => {
    expect(() =>
      validatePersonalAccountForOwner({
        personalSpaceId,
        account: {
          id: 'acc-1',
          spaceId: otherSpaceId,
          currency: 'EUR',
          archivedAt: null,
        },
      }),
    ).toThrow(ForbiddenException);
    try {
      validatePersonalAccountForOwner({
        personalSpaceId,
        account: {
          id: 'acc-1',
          spaceId: otherSpaceId,
          currency: 'EUR',
          archivedAt: null,
        },
      });
    } catch (e) {
      expect((e as ForbiddenException).getResponse()).toMatchObject({
        code: 'PERSONAL_ACCOUNT_NOT_OWNED',
      });
    }
  });

  it('throws ACCOUNT_ARCHIVED when account is archived', () => {
    expect(() =>
      validatePersonalAccountForOwner({
        personalSpaceId,
        account: {
          id: 'acc-1',
          spaceId: personalSpaceId,
          currency: 'EUR',
          archivedAt: new Date(),
        },
      }),
    ).toThrow(ConflictException);
  });

  it('throws CROSS_SPACE_CURRENCY_MISMATCH when currencies differ', () => {
    expect(() =>
      validatePersonalAccountForOwner({
        personalSpaceId,
        account: {
          id: 'acc-1',
          spaceId: personalSpaceId,
          currency: 'USD',
          archivedAt: null,
        },
        requiredCurrency: 'EUR',
      }),
    ).toThrow(BadRequestException);
  });
});
