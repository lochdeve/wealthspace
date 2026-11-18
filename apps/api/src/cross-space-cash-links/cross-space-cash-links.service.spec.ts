import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  CrossSpaceCashLinkKind,
  Prisma,
  TransactionType,
} from '@prisma/client';
import { CrossSpaceCashLinksService } from './cross-space-cash-links.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('CrossSpaceCashLinksService', () => {
  const ownerUserId = '00000000-0000-4000-8000-000000000010';
  const personalSpaceId = '00000000-0000-4000-8000-000000000020';
  const personalAccountId = '00000000-0000-4000-8000-000000000030';
  const sharedSpaceId = '00000000-0000-4000-8000-000000000040';
  const sharedExpenseId = '00000000-0000-4000-8000-000000000050';

  type TestTx = {
    user: { findUnique: jest.Mock };
    account: { findFirst: jest.Mock };
    crossSpaceCashLink: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    financialTransaction: {
      create: jest.Mock;
    };
  };

  function buildService(overrides: {
    user?: { personalSpaceId: string } | null;
    account?: {
      id: string;
      spaceId: string;
      currency: string;
      archivedAt: Date | null;
    } | null;
    existingLink?: unknown;
  }): { service: CrossSpaceCashLinksService; tx: TestTx } {
    const tx: TestTx = {
      user: {
        findUnique: jest.fn(() => Promise.resolve(overrides.user ?? null)),
      },
      account: {
        findFirst: jest.fn(() => Promise.resolve(overrides.account ?? null)),
      },
      crossSpaceCashLink: {
        findFirst: jest.fn(() =>
          Promise.resolve(overrides.existingLink ?? null),
        ),
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'link-1', ...args.data }),
          ),
      },
      financialTransaction: {
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'tx-personal-1', ...args.data }),
          ),
      },
    };

    const prisma = {
      user: { findUnique: tx.user.findUnique },
      account: { findFirst: tx.account.findFirst },
      crossSpaceCashLink: { findFirst: jest.fn() },
    } as unknown as PrismaService;

    const service = new CrossSpaceCashLinksService(prisma);
    return { service, tx };
  }

  it('requirePersonalAccountOwned rejects account outside personal space', async () => {
    const { service } = buildService({
      user: { personalSpaceId },
      account: {
        id: personalAccountId,
        spaceId: sharedSpaceId,
        currency: 'EUR',
        archivedAt: null,
      },
    });

    await expect(
      service.requirePersonalAccountOwned(
        ownerUserId,
        personalAccountId,
        'EUR',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('createMemberPaymentLinkInTransaction rejects duplicate link', async () => {
    const { service, tx } = buildService({
      user: { personalSpaceId },
      account: {
        id: personalAccountId,
        spaceId: personalSpaceId,
        currency: 'EUR',
        archivedAt: null,
      },
      existingLink: { id: 'existing' },
    });

    await expect(
      service.createMemberPaymentLinkInTransaction(
        tx as unknown as Prisma.TransactionClient,
        {
          ownerUserId,
          personalAccountId,
          sharedSpaceId,
          sharedExpenseId,
          amount: new Prisma.Decimal('120.0000'),
          currency: 'EUR',
          occurredAt: new Date(),
          recordedByUserId: ownerUserId,
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('createMemberPaymentLinkInTransaction creates EXPENSE and link', async () => {
    const { service, tx } = buildService({
      user: { personalSpaceId },
      account: {
        id: personalAccountId,
        spaceId: personalSpaceId,
        currency: 'EUR',
        archivedAt: null,
      },
    });

    const result = await service.createMemberPaymentLinkInTransaction(
      tx as unknown as Prisma.TransactionClient,
      {
        ownerUserId,
        personalAccountId,
        sharedSpaceId,
        sharedExpenseId,
        amount: new Prisma.Decimal('120.0000'),
        currency: 'EUR',
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        recordedByUserId: ownerUserId,
      },
    );

    expect(result.personalTransactionId).toBe('tx-personal-1');
    expect(tx.financialTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: TransactionType.EXPENSE,
          spaceId: personalSpaceId,
          accountId: personalAccountId,
        }),
      }),
    );
    expect(tx.crossSpaceCashLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: CrossSpaceCashLinkKind.SHARED_EXPENSE_MEMBER_PAYMENT,
          sharedExpenseId,
          ownerUserId,
        }),
      }),
    );
  });
});
