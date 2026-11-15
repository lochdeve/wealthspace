import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryType,
  PaymentSource,
  Prisma,
  SplitMode,
  SpaceType,
  TransactionType,
} from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ActiveSpaceMembership } from '../spaces/spaces.service';
import { SpacesService } from '../spaces/spaces.service';
import { formatTransactionAmount } from '../transactions/money';
import { allocate } from './allocate';
import { AllocateError } from './allocate-error';
import type { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import type { SharedExpenseDetailDto } from './dto/shared-expense-detail.dto';
import { computeGeneratedDebts } from './generated-debts';
import { assertUserMemberAt, requireUserDisplayName } from './membership-at';
import { assertPayerSelectionAllowed } from './payer-authorization';
import {
  participantUserIdsFromSplit,
  toAllocateSplitInput,
} from './split-input';
import { voidSharedExpenseInTransaction } from './space-account-void';

type PreparedSharedExpense = {
  currency: string;
  occurredAt: Date;
  splitMode: SplitMode;
  paymentSource: PaymentSource;
  paidByUserId: string | null;
  accountId: string | null;
  allocations: {
    userId: string;
    displayName: string;
    allocatedAmount: Prisma.Decimal;
    sharePercent: Prisma.Decimal | null;
  }[];
};

@Injectable()
export class SharedExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
    private readonly accountsService: AccountsService,
  ) {}

  async previewInSpace(
    actorUserId: string,
    spaceId: string,
    dto: CreateSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    const prepared = await this.prepare(actorUserId, membership, spaceId, dto);

    return this.toPreviewDto(prepared, {
      actorUserId,
      spaceId,
      dto,
    });
  }

  async createInSpace(
    actorUserId: string,
    spaceId: string,
    dto: CreateSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    const prepared = await this.prepare(actorUserId, membership, spaceId, dto);

    const row = await this.prisma.$transaction(async (tx) => {
      if (prepared.paymentSource === PaymentSource.SPACE_ACCOUNT) {
        return this.insertSpaceAccountExpense(tx, {
          actorUserId,
          spaceId,
          dto,
          prepared,
        });
      }
      return this.insertMemberPaidExpense(tx, {
        actorUserId,
        spaceId,
        dto,
        prepared,
      });
    });

    return await this.toDetailDto(row);
  }

  /**
   * Logical void with SPACE_ACCOUNT payment transaction voided atomically (P-13 / option B).
   * HTTP exposure and P-09 permission checks arrive in B-6.4.
   */
  async voidSharedExpenseInSpace(
    actorUserId: string,
    spaceId: string,
    sharedExpenseId: string,
  ): Promise<void> {
    await this.spacesService.requireActiveMembership(actorUserId, spaceId);
    const at = new Date();
    await this.prisma.$transaction((tx) =>
      voidSharedExpenseInTransaction(tx, {
        spaceId,
        sharedExpenseId,
        voidedByUserId: actorUserId,
        voidedAt: at,
      }),
    );
  }

  private async prepare(
    actorUserId: string,
    membership: ActiveSpaceMembership,
    spaceId: string,
    dto: CreateSharedExpenseDto,
  ): Promise<PreparedSharedExpense> {
    this.assertSharedSpace(membership);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    let currency: string;
    let paymentSource: PaymentSource;
    let paidByUserId: string | null = null;
    let accountId: string | null = null;

    if (dto.payment.source === 'MEMBER') {
      paymentSource = PaymentSource.MEMBER;
      paidByUserId = dto.payment.paidByUserId;
      assertPayerSelectionAllowed(membership.role, actorUserId, paidByUserId);
      await assertUserMemberAt(
        this.prisma,
        spaceId,
        paidByUserId,
        occurredAt,
        'PAYER_NOT_MEMBER',
      );
      currency =
        dto.currency ??
        membership.space.displayCurrency ??
        (() => {
          throw new BadRequestException({
            statusCode: 400,
            code: 'CURRENCY_REQUIRED',
            message:
              'currency is required when the space has no displayCurrency',
          });
        })();
    } else {
      paymentSource = PaymentSource.SPACE_ACCOUNT;
      const account = await this.accountsService.requireWritableAccount(
        spaceId,
        dto.payment.accountId,
      );
      accountId = account.id;
      currency = account.currency;
      if (
        dto.currency !== undefined &&
        dto.currency.toUpperCase() !== currency
      ) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'CURRENCY_MISMATCH',
          message: 'currency must match the space account',
        });
      }
    }

    await this.resolveCategory(spaceId, dto.categoryId);

    const participantIds = participantUserIdsFromSplit(dto.split);
    await this.assertParticipantRules(
      paymentSource,
      paidByUserId,
      participantIds,
      spaceId,
      occurredAt,
    );

    let allocated;
    try {
      allocated = allocate(
        dto.totalAmount,
        currency,
        toAllocateSplitInput(dto.split),
      );
    } catch (error) {
      this.rethrowAllocate(error);
    }

    const sharePercentByUser = this.sharePercentsByUser(dto.split);
    const allocations = await Promise.all(
      allocated.map(async (part) => ({
        userId: part.userId,
        displayName: await requireUserDisplayName(this.prisma, part.userId),
        allocatedAmount: new Prisma.Decimal(part.allocatedAmount),
        sharePercent:
          sharePercentByUser.get(part.userId) !== undefined
            ? new Prisma.Decimal(sharePercentByUser.get(part.userId) ?? '0')
            : null,
      })),
    );

    return {
      currency,
      occurredAt,
      splitMode: dto.split.mode,
      paymentSource,
      paidByUserId,
      accountId,
      allocations,
    };
  }

  private async assertParticipantRules(
    paymentSource: PaymentSource,
    paidByUserId: string | null,
    participantIds: string[],
    spaceId: string,
    occurredAt: Date,
  ): Promise<void> {
    const unique = new Set(participantIds);
    if (unique.size !== participantIds.length) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'DUPLICATE_PARTICIPANT',
        message: 'Each participant may appear only once',
      });
    }

    for (const userId of participantIds) {
      await assertUserMemberAt(
        this.prisma,
        spaceId,
        userId,
        occurredAt,
        'PARTICIPANT_NOT_MEMBER',
      );
    }

    if (paymentSource === PaymentSource.MEMBER) {
      const distinctFromPayer = participantIds.filter(
        (id) => id !== paidByUserId,
      );
      if (distinctFromPayer.length === 0) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'INSUFFICIENT_PARTICIPANTS',
          message: 'At least one participant must be different from the payer',
        });
      }
    } else if (participantIds.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INSUFFICIENT_PARTICIPANTS',
        message: 'At least one participant is required',
      });
    }
  }

  private sharePercentsByUser(
    split: CreateSharedExpenseDto['split'],
  ): Map<string, string> {
    if (split.mode !== SplitMode.PERCENTAGE) {
      return new Map();
    }
    return new Map(split.shares.map((s) => [s.userId, s.percent]));
  }

  private async resolveCategory(
    spaceId: string,
    categoryId: string | undefined,
  ): Promise<void> {
    if (categoryId === undefined) {
      return;
    }
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, spaceId },
    });
    if (category === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }
    if (category.type !== CategoryType.EXPENSE) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_CATEGORY_TYPE',
        message: 'Category must be of type EXPENSE',
      });
    }
  }

  private assertSharedSpace(membership: ActiveSpaceMembership): void {
    if (membership.space.type !== SpaceType.SHARED) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'SHARED_SPACE_REQUIRED',
        message: 'Shared expenses are only available in SHARED spaces',
      });
    }
  }

  private rethrowAllocate(error: unknown): never {
    if (error instanceof AllocateError) {
      const allocateError = error;
      throw new BadRequestException({
        statusCode: 400,
        code: allocateError.code,
        message: allocateError.message,
      });
    }
    throw error;
  }

  private async insertMemberPaidExpense(
    tx: Prisma.TransactionClient,
    params: {
      actorUserId: string;
      spaceId: string;
      dto: CreateSharedExpenseDto;
      prepared: PreparedSharedExpense;
    },
  ) {
    const totalAmount = new Prisma.Decimal(params.dto.totalAmount);
    const shared = await tx.sharedExpense.create({
      data: {
        spaceId: params.spaceId,
        paymentSource: PaymentSource.MEMBER,
        totalAmount,
        currency: params.prepared.currency,
        description: params.dto.description,
        occurredAt: params.prepared.occurredAt,
        splitMode: params.prepared.splitMode,
        recordedByUserId: params.actorUserId,
        paidByUserId: params.prepared.paidByUserId,
        categoryId: params.dto.categoryId,
      },
    });

    await tx.expenseParticipant.createMany({
      data: params.prepared.allocations.map((a) => ({
        sharedExpenseId: shared.id,
        userId: a.userId,
        displayNameSnapshot: a.displayName,
        allocatedAmount: a.allocatedAmount,
        sharePercent: a.sharePercent,
      })),
    });

    return tx.sharedExpense.findFirstOrThrow({
      where: { id: shared.id },
      include: { participants: true },
    });
  }

  private async insertSpaceAccountExpense(
    tx: Prisma.TransactionClient,
    params: {
      actorUserId: string;
      spaceId: string;
      dto: CreateSharedExpenseDto;
      prepared: PreparedSharedExpense;
    },
  ) {
    const totalAmount = new Prisma.Decimal(params.dto.totalAmount);
    const financialTransaction = await tx.financialTransaction.create({
      data: {
        spaceId: params.spaceId,
        type: TransactionType.EXPENSE,
        amount: totalAmount,
        currency: params.prepared.currency,
        description: params.dto.description,
        occurredAt: params.prepared.occurredAt,
        recordedByUserId: params.actorUserId,
        accountId: params.prepared.accountId,
        categoryId: params.dto.categoryId,
      },
    });

    const shared = await tx.sharedExpense.create({
      data: {
        spaceId: params.spaceId,
        paymentSource: PaymentSource.SPACE_ACCOUNT,
        totalAmount,
        currency: params.prepared.currency,
        description: params.dto.description,
        occurredAt: params.prepared.occurredAt,
        splitMode: params.prepared.splitMode,
        recordedByUserId: params.actorUserId,
        financialTransactionId: financialTransaction.id,
        categoryId: params.dto.categoryId,
      },
    });

    await tx.expenseParticipant.createMany({
      data: params.prepared.allocations.map((a) => ({
        sharedExpenseId: shared.id,
        userId: a.userId,
        displayNameSnapshot: a.displayName,
        allocatedAmount: a.allocatedAmount,
        sharePercent: a.sharePercent,
      })),
    });

    return tx.sharedExpense.findFirstOrThrow({
      where: { id: shared.id },
      include: { participants: true },
    });
  }

  private toPreviewDto(
    prepared: PreparedSharedExpense,
    context: {
      actorUserId: string;
      spaceId: string;
      dto: CreateSharedExpenseDto;
    },
  ): SharedExpenseDetailDto {
    const participants = prepared.allocations.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      allocatedAmount: formatTransactionAmount(p.allocatedAmount),
      sharePercent: p.sharePercent !== null ? p.sharePercent.toFixed(4) : null,
    }));

    const payment =
      prepared.paymentSource === PaymentSource.MEMBER
        ? {
            source: 'MEMBER' as const,
            paidByUserId: prepared.paidByUserId ?? context.actorUserId,
          }
        : {
            source: 'SPACE_ACCOUNT' as const,
            accountId:
              context.dto.payment.source === 'SPACE_ACCOUNT'
                ? context.dto.payment.accountId
                : '',
          };

    const generatedDebts = computeGeneratedDebts(
      prepared.paymentSource === PaymentSource.MEMBER
        ? 'MEMBER'
        : 'SPACE_ACCOUNT',
      prepared.paidByUserId,
      participants,
    );

    return {
      id: '00000000-0000-4000-8000-000000000000',
      description: context.dto.description,
      totalAmount: formatTransactionAmount(
        new Prisma.Decimal(context.dto.totalAmount),
      ),
      currency: prepared.currency,
      occurredAt: prepared.occurredAt.toISOString(),
      splitMode: prepared.splitMode,
      payment,
      participants,
      generatedDebts,
      recordedByUserId: context.actorUserId,
      voidedAt: null,
      version: 0,
    };
  }

  private async toDetailDto(
    row: Prisma.SharedExpenseGetPayload<{ include: { participants: true } }>,
  ): Promise<SharedExpenseDetailDto> {
    const participants = row.participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayNameSnapshot,
      allocatedAmount: formatTransactionAmount(p.allocatedAmount),
      sharePercent: p.sharePercent !== null ? p.sharePercent.toFixed(4) : null,
    }));

    let paymentResponse: SharedExpenseDetailDto['payment'];
    if (row.paymentSource === PaymentSource.MEMBER) {
      paymentResponse = {
        source: 'MEMBER',
        paidByUserId: row.paidByUserId ?? '',
      };
    } else {
      const ft =
        row.financialTransactionId !== null
          ? await this.prisma.financialTransaction.findFirst({
              where: {
                id: row.financialTransactionId,
                spaceId: row.spaceId,
              },
              select: { accountId: true },
            })
          : null;
      paymentResponse = {
        source: 'SPACE_ACCOUNT',
        accountId: ft?.accountId ?? '',
      };
    }

    const generatedDebts = computeGeneratedDebts(
      row.paymentSource === PaymentSource.MEMBER ? 'MEMBER' : 'SPACE_ACCOUNT',
      row.paidByUserId,
      participants,
    );

    return {
      id: row.id,
      description: row.description ?? undefined,
      totalAmount: formatTransactionAmount(row.totalAmount),
      currency: row.currency,
      occurredAt: row.occurredAt.toISOString(),
      splitMode: row.splitMode,
      payment: paymentResponse,
      participants,
      generatedDebts,
      recordedByUserId: row.recordedByUserId,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      version: row.version,
    };
  }
}
