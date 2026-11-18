import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CrossSpaceCashLinkKind,
  Prisma,
  TransactionType,
  type CrossSpaceCashLink,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  validatePersonalAccountForOwner,
  type PersonalAccountRow,
} from './personal-account-ownership';

export type CreateMemberPaymentLinkInput = {
  ownerUserId: string;
  personalAccountId: string;
  sharedSpaceId: string;
  sharedExpenseId: string;
  amount: Prisma.Decimal;
  currency: string;
  occurredAt: Date;
  recordedByUserId: string;
  description?: string | null;
};

export type CreateSettlementPersonalLinkInput = {
  kind:
    | typeof CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT
    | typeof CrossSpaceCashLinkKind.SETTLEMENT_TO_IN;
  ownerUserId: string;
  personalAccountId: string;
  sharedSpaceId: string;
  settlementId: string;
  amount: Prisma.Decimal;
  currency: string;
  occurredAt: Date;
  recordedByUserId: string;
  description?: string | null;
};

export type CreateContributionPersonalLegInput = {
  ownerUserId: string;
  personalAccountId: string;
  sharedSpaceId: string;
  contributionGroupId: string;
  amount: Prisma.Decimal;
  currency: string;
  occurredAt: Date;
  recordedByUserId: string;
  description?: string | null;
};

@Injectable()
export class CrossSpaceCashLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async requirePersonalAccountOwned(
    ownerUserId: string,
    personalAccountId: string,
    requiredCurrency?: string,
  ): Promise<{ personalSpaceId: string; account: PersonalAccountRow }> {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { personalSpaceId: true },
    });
    if (user === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const account = await this.prisma.account.findFirst({
      where: { id: personalAccountId },
      select: {
        id: true,
        spaceId: true,
        currency: true,
        archivedAt: true,
      },
    });

    const validated = validatePersonalAccountForOwner({
      personalSpaceId: user.personalSpaceId,
      account,
      requiredCurrency,
    });

    return { personalSpaceId: user.personalSpaceId, account: validated };
  }

  async requirePersonalAccountOwnedInTransaction(
    tx: Prisma.TransactionClient,
    ownerUserId: string,
    personalAccountId: string,
    requiredCurrency: string,
  ): Promise<{ personalSpaceId: string; account: PersonalAccountRow }> {
    const user = await tx.user.findUnique({
      where: { id: ownerUserId },
      select: { personalSpaceId: true },
    });
    if (user === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const account = await tx.account.findFirst({
      where: { id: personalAccountId },
      select: {
        id: true,
        spaceId: true,
        currency: true,
        archivedAt: true,
      },
    });

    const validated = validatePersonalAccountForOwner({
      personalSpaceId: user.personalSpaceId,
      account,
      requiredCurrency,
    });

    return { personalSpaceId: user.personalSpaceId, account: validated };
  }

  async findMemberPaymentLink(
    sharedExpenseId: string,
    ownerUserId: string,
  ): Promise<CrossSpaceCashLink | null> {
    return this.prisma.crossSpaceCashLink.findFirst({
      where: {
        kind: CrossSpaceCashLinkKind.SHARED_EXPENSE_MEMBER_PAYMENT,
        sharedExpenseId,
        ownerUserId,
      },
    });
  }

  async findLinksForSettlement(
    settlementId: string,
  ): Promise<CrossSpaceCashLink[]> {
    return this.prisma.crossSpaceCashLink.findMany({
      where: { settlementId },
    });
  }

  async createMemberPaymentLinkInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateMemberPaymentLinkInput,
  ): Promise<{ personalTransactionId: string; linkId: string }> {
    const existing = await tx.crossSpaceCashLink.findFirst({
      where: {
        kind: CrossSpaceCashLinkKind.SHARED_EXPENSE_MEMBER_PAYMENT,
        sharedExpenseId: input.sharedExpenseId,
        ownerUserId: input.ownerUserId,
      },
    });
    if (existing !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'PERSONAL_LINK_ALREADY_EXISTS',
        message: 'A personal payment link already exists for this expense',
      });
    }

    const { personalSpaceId } =
      await this.requirePersonalAccountOwnedInTransaction(
        tx,
        input.ownerUserId,
        input.personalAccountId,
        input.currency,
      );

    const personalTx = await tx.financialTransaction.create({
      data: {
        spaceId: personalSpaceId,
        type: TransactionType.EXPENSE,
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
        occurredAt: input.occurredAt,
        recordedByUserId: input.recordedByUserId,
        accountId: input.personalAccountId,
      },
    });

    const link = await tx.crossSpaceCashLink.create({
      data: {
        kind: CrossSpaceCashLinkKind.SHARED_EXPENSE_MEMBER_PAYMENT,
        ownerUserId: input.ownerUserId,
        personalTransactionId: personalTx.id,
        sharedSpaceId: input.sharedSpaceId,
        sharedExpenseId: input.sharedExpenseId,
      },
    });

    return { personalTransactionId: personalTx.id, linkId: link.id };
  }

  async createSettlementPersonalLinkInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateSettlementPersonalLinkInput,
  ): Promise<{ personalTransactionId: string; linkId: string }> {
    const existing = await tx.crossSpaceCashLink.findFirst({
      where: {
        settlementId: input.settlementId,
        ownerUserId: input.ownerUserId,
        kind: input.kind,
      },
    });
    if (existing !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'PERSONAL_LINK_ALREADY_EXISTS',
        message: 'A personal cash-flow link already exists for this side',
      });
    }

    const { personalSpaceId } =
      await this.requirePersonalAccountOwnedInTransaction(
        tx,
        input.ownerUserId,
        input.personalAccountId,
        input.currency,
      );

    const txType =
      input.kind === CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT
        ? TransactionType.EXPENSE
        : TransactionType.INCOME;

    const personalTx = await tx.financialTransaction.create({
      data: {
        spaceId: personalSpaceId,
        type: txType,
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
        occurredAt: input.occurredAt,
        recordedByUserId: input.recordedByUserId,
        accountId: input.personalAccountId,
      },
    });

    const link = await tx.crossSpaceCashLink.create({
      data: {
        kind: input.kind,
        ownerUserId: input.ownerUserId,
        personalTransactionId: personalTx.id,
        sharedSpaceId: input.sharedSpaceId,
        settlementId: input.settlementId,
      },
    });

    return { personalTransactionId: personalTx.id, linkId: link.id };
  }

  async createContributionPersonalLegInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateContributionPersonalLegInput,
  ): Promise<{ personalTransactionId: string; linkId: string }> {
    const { personalSpaceId } =
      await this.requirePersonalAccountOwnedInTransaction(
        tx,
        input.ownerUserId,
        input.personalAccountId,
        input.currency,
      );

    const personalTx = await tx.financialTransaction.create({
      data: {
        spaceId: personalSpaceId,
        type: TransactionType.EXPENSE,
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
        occurredAt: input.occurredAt,
        recordedByUserId: input.recordedByUserId,
        accountId: input.personalAccountId,
      },
    });

    const link = await tx.crossSpaceCashLink.create({
      data: {
        kind: CrossSpaceCashLinkKind.CONTRIBUTION_PAIR,
        ownerUserId: input.ownerUserId,
        personalTransactionId: personalTx.id,
        sharedSpaceId: input.sharedSpaceId,
        contributionGroupId: input.contributionGroupId,
      },
    });

    return { personalTransactionId: personalTx.id, linkId: link.id };
  }

  async voidLinkedPersonalTransactionInTransaction(
    tx: Prisma.TransactionClient,
    linkId: string,
    voidedByUserId: string,
    voidedAt: Date,
  ): Promise<void> {
    const link = await tx.crossSpaceCashLink.findUnique({
      where: { id: linkId },
    });
    if (link === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'PERSONAL_LINK_NOT_FOUND',
        message: 'Personal cash link not found',
      });
    }

    await tx.financialTransaction.updateMany({
      where: { id: link.personalTransactionId, voidedAt: null },
      data: { voidedAt, voidedByUserId },
    });
  }

  async voidAllLinksForSharedExpenseInTransaction(
    tx: Prisma.TransactionClient,
    sharedExpenseId: string,
    voidedByUserId: string,
    voidedAt: Date,
  ): Promise<void> {
    const links = await tx.crossSpaceCashLink.findMany({
      where: { sharedExpenseId },
    });
    for (const link of links) {
      await this.voidLinkedPersonalTransactionInTransaction(
        tx,
        link.id,
        voidedByUserId,
        voidedAt,
      );
    }
  }

  async voidAllLinksForSettlementInTransaction(
    tx: Prisma.TransactionClient,
    settlementId: string,
    voidedByUserId: string,
    voidedAt: Date,
  ): Promise<void> {
    const links = await tx.crossSpaceCashLink.findMany({
      where: { settlementId },
    });
    for (const link of links) {
      await this.voidLinkedPersonalTransactionInTransaction(
        tx,
        link.id,
        voidedByUserId,
        voidedAt,
      );
    }
  }

  async updateLinkedPersonalAmountInTransaction(
    tx: Prisma.TransactionClient,
    linkId: string,
    amount: Prisma.Decimal,
    currency: string,
  ): Promise<void> {
    const link = await tx.crossSpaceCashLink.findUnique({
      where: { id: linkId },
    });
    if (link === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'PERSONAL_LINK_NOT_FOUND',
        message: 'Personal cash link not found',
      });
    }

    await tx.financialTransaction.updateMany({
      where: { id: link.personalTransactionId, voidedAt: null },
      data: { amount, currency },
    });
  }
}
