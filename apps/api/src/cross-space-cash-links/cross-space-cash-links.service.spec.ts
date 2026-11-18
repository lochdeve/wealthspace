import { jest } from '@jest/globals';
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

  function buildService(overrides: {
    user?: { personalSpaceId: string } | null;
    account?: {
      id: string;
      spaceId: string;
      currency: string;
      archivedAt: Date | null;
    } | null;
    existingLink?: unknown;
  }): CrossSpaceCashLinksService {
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(overrides.user ?? null),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue(overrides.account ?? null),
      },
      crossSpaceCashLink: {
        findFirst: jest.fn().mockResolvedValue(overrides.existingLink ?? null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'link-1', ...data }),
          ),
      },
      financialTransaction: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'tx-personal-1', ...data }),
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
