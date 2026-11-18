import {
  BadRequestException,
  ConflictException,
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
import { runWithVersionConflictMapping } from '../common/prisma-version-conflict';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ActiveSpaceMembership } from '../spaces/spaces.service';
import { SpacesService } from '../spaces/spaces.service';
import { formatTransactionAmount } from '../transactions/money';
import { allocate } from './allocate';
import { AllocateError } from './allocate-error';
import type { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import type { SharedExpenseDetailDto } from './dto/shared-expense-detail.dto';
import type { SharedExpenseRevisionDto } from './dto/shared-expense-revision.dto';
import type { UpdateSharedExpenseDto } from './dto/update-shared-expense.dto';
import type { VoidSharedExpenseDto } from './dto/void-shared-expense.dto';
import { computeGeneratedDebts } from './generated-debts';
import { assertUserMemberAt, requireUserDisplayName } from './membership-at';
import { assertPayerSelectionAllowed } from './payer-authorization';
import { assertSharedExpenseMutationAllowed } from './shared-expense-mutation-auth';
import { buildSharedExpenseSnapshot } from './shared-expense-revision';
import {
  participantUserIdsFromSplit,
  toAllocateSplitInput,
} from './split-input';
import { voidSharedExpenseInTransaction } from './space-account-void';

const SHARED_EXPENSE_INCLUDE = {
  participants: true,
  financialTransaction: { select: { accountId: true } },
} as const;

type SharedExpenseRow = Prisma.SharedExpenseGetPayload<{
  include: typeof SHARED_EXPENSE_INCLUDE;
}>;

export type ListSharedExpensesQuery = {
  from?: Date;
  to?: Date;
  participantUserId?: string;
  includeVoided?: boolean;
  limit: number;
};

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

    const created = await this.prisma.$transaction(async (tx) => {
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

    const row = await this.findSharedExpenseRow(spaceId, created.id);
    return this.toDetailDto(row);
  }

  async listInSpace(
    actorUserId: string,
    spaceId: string,
    query: ListSharedExpensesQuery,
  ): Promise<SharedExpenseDetailDto[]> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const where: Prisma.SharedExpenseWhereInput = {
      spaceId,
      ...(query.includeVoided ? {} : { voidedAt: null }),
      ...(query.from !== undefined || query.to !== undefined
        ? {
            occurredAt: {
              ...(query.from !== undefined ? { gte: query.from } : {}),
              ...(query.to !== undefined ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.participantUserId !== undefined
        ? {
            participants: {
              some: { userId: query.participantUserId },
            },
          }
        : {}),
    };

    const rows = await this.prisma.sharedExpense.findMany({
      where,
      include: SHARED_EXPENSE_INCLUDE,
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: query.limit,
    });

    return rows.map((row) => this.toDetailDto(row));
  }

  async getInSpace(
    actorUserId: string,
    spaceId: string,
    sharedExpenseId: string,
  ): Promise<SharedExpenseDetailDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);
    const row = await this.findSharedExpenseRow(spaceId, sharedExpenseId);
    return this.toDetailDto(row);
  }

  async updateInSpace(
    actorUserId: string,
    spaceId: string,
    sharedExpenseId: string,
    dto: UpdateSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const current = await this.findSharedExpenseRow(spaceId, sharedExpenseId);
    this.assertNotVoided(current);
    assertSharedExpenseMutationAllowed(membership.role, actorUserId, current);

    if (current.version !== dto.expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'Shared expense was modified by another request',
      });
    }

    this.assertPaymentSourceUnchanged(current.paymentSource, dto);

    const prepared = await this.prepare(actorUserId, membership, spaceId, dto);

    if (
      prepared.paymentSource === PaymentSource.MEMBER &&
      dto.payment.source === 'MEMBER'
    ) {
      assertPayerSelectionAllowed(
        membership.role,
        actorUserId,
        dto.payment.paidByUserId,
      );
    }

    const totalAmount = new Prisma.Decimal(dto.totalAmount);

    await runWithVersionConflictMapping(() =>
      this.prisma.$transaction(async (tx) => {
        const accountIdForSnapshot =
          current.financialTransaction?.accountId ?? null;

        await this.appendRevision(tx, {
          sharedExpenseId: current.id,
          snapshot: buildSharedExpenseSnapshot(current, {
            accountId: accountIdForSnapshot,
          }),
          changedByUserId: actorUserId,
          reason: dto.reason,
        });

        await tx.expenseParticipant.deleteMany({
          where: { sharedExpenseId: current.id },
        });
        await tx.expenseParticipant.createMany({
          data: prepared.allocations.map((a) => ({
            sharedExpenseId: current.id,
            userId: a.userId,
            displayNameSnapshot: a.displayName,
            allocatedAmount: a.allocatedAmount,
            sharePercent: a.sharePercent,
          })),
        });

        const updated = await tx.sharedExpense.updateMany({
          where: {
            id: current.id,
            spaceId,
            version: dto.expectedVersion,
          },
          data: {
            totalAmount,
            currency: prepared.currency,
            description: dto.description,
            occurredAt: prepared.occurredAt,
            splitMode: prepared.splitMode,
            paidByUserId:
              prepared.paymentSource === PaymentSource.MEMBER
                ? prepared.paidByUserId
                : null,
            categoryId: dto.categoryId ?? null,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new ConflictException({
            statusCode: 409,
            code: 'VERSION_CONFLICT',
            message: 'Shared expense was modified by another request',
          });
        }

        if (
          current.paymentSource === PaymentSource.SPACE_ACCOUNT &&
          current.financialTransactionId !== null &&
          dto.payment.source === 'SPACE_ACCOUNT'
        ) {
          await tx.financialTransaction.updateMany({
            where: {
              id: current.financialTransactionId,
              spaceId,
              voidedAt: null,
            },
            data: {
              amount: totalAmount,
              currency: prepared.currency,
              description: dto.description,
              occurredAt: prepared.occurredAt,
              categoryId: dto.categoryId ?? null,
              accountId: dto.payment.accountId,
            },
          });
        }
      }),
    );

    const row = await this.findSharedExpenseRow(spaceId, sharedExpenseId);
    return this.toDetailDto(row);
  }

  async voidInSpace(
    actorUserId: string,
    spaceId: string,
    sharedExpenseId: string,
    dto: VoidSharedExpenseDto,
  ): Promise<SharedExpenseDetailDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const current = await this.findSharedExpenseRow(spaceId, sharedExpenseId);
    assertSharedExpenseMutationAllowed(membership.role, actorUserId, current);

    if (current.voidedAt !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_VOIDED',
        message: 'Shared expense is already voided',
      });
    }

    if (current.version !== dto.expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'Shared expense was modified by another request',
      });
    }

    const at = new Date();

    await runWithVersionConflictMapping(() =>
      this.prisma.$transaction(async (tx) => {
        await this.appendRevision(tx, {
          sharedExpenseId: current.id,
          snapshot: buildSharedExpenseSnapshot(current, {
            accountId: current.financialTransaction?.accountId ?? null,
          }),
          changedByUserId: actorUserId,
          reason: dto.reason,
        });

        await voidSharedExpenseInTransaction(tx, {
          spaceId,
          sharedExpenseId,
          voidedByUserId: actorUserId,
          voidedAt: at,
        });
      }),
    );

    const row = await this.findSharedExpenseRow(spaceId, sharedExpenseId);
    return this.toDetailDto(row);
  }

  async listRevisionsInSpace(
    actorUserId: string,
    spaceId: string,
    sharedExpenseId: string,
  ): Promise<SharedExpenseRevisionDto[]> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);
    await this.findSharedExpenseRow(spaceId, sharedExpenseId);

    const rows = await this.prisma.financialRevision.findMany({
      where: { sharedExpenseId, sharedExpense: { spaceId } },
      orderBy: { revisionNumber: 'asc' },
    });

    return rows.map((row) => ({
      revisionNumber: row.revisionNumber,
      changedAt: row.changedAt.toISOString(),
      changedByUserId: row.changedByUserId,
      reason: row.reason,
      snapshot: row.snapshot as Record<string, unknown>,
    }));
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

  private toDetailDto(row: SharedExpenseRow): SharedExpenseDetailDto {
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
      paymentResponse = {
        source: 'SPACE_ACCOUNT',
        accountId: row.financialTransaction?.accountId ?? '',
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

  private async findSharedExpenseRow(
    spaceId: string,
    sharedExpenseId: string,
  ): Promise<SharedExpenseRow> {
    const row = await this.prisma.sharedExpense.findFirst({
      where: { id: sharedExpenseId, spaceId },
      include: SHARED_EXPENSE_INCLUDE,
    });
    if (row === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'SHARED_EXPENSE_NOT_FOUND',
        message: 'Shared expense not found',
      });
    }
    return row;
  }

  private assertNotVoided(row: SharedExpenseRow): void {
    if (row.voidedAt !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_VOIDED',
        message: 'Shared expense is voided',
      });
    }
  }

  private assertPaymentSourceUnchanged(
    current: PaymentSource,
    dto: CreateSharedExpenseDto,
  ): void {
    const next =
      dto.payment.source === 'MEMBER'
        ? PaymentSource.MEMBER
        : PaymentSource.SPACE_ACCOUNT;
    if (current !== next) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'PAYMENT_SOURCE_IMMUTABLE',
        message: 'payment.source cannot be changed when editing',
      });
    }
  }

  private async appendRevision(
    tx: Prisma.TransactionClient,
    params: {
      sharedExpenseId: string;
      snapshot: Prisma.InputJsonValue;
      changedByUserId: string;
      reason?: string;
    },
  ): Promise<void> {
    const lastRev = await tx.financialRevision.findFirst({
      where: { sharedExpenseId: params.sharedExpenseId },
      orderBy: { revisionNumber: 'desc' },
    });
    const revisionNumber = (lastRev?.revisionNumber ?? 0) + 1;

    await tx.financialRevision.create({
      data: {
        revisionNumber,
        snapshot: params.snapshot,
        changedByUserId: params.changedByUserId,
        sharedExpenseId: params.sharedExpenseId,
        reason: params.reason,
      },
    });
  }
}
