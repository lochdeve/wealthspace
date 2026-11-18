import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryType,
  Prisma,
  SpaceType,
  TransactionType,
  type FinancialTransaction,
} from '@prisma/client';
import { runWithVersionConflictMapping } from '../common/prisma-version-conflict';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { SpacesService } from '../spaces/spaces.service';
import type { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';
import type {
  CreateExpenseDto,
  CreateIncomeDto,
  CreateTransferDto,
} from './dto/create-cashflow.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import type { CrossSpaceSummaryDto } from './dto/cross-space-summary.dto';
import type { FinancialTransactionDto } from './dto/transaction-response.dto';
import { assertSharedExpenseAttribution } from './expense-attribution';
import {
  formatTransactionAmount,
  parsePositiveMoneyAmount,
  parseSignedMoneyAmount,
} from './money';
import { buildTransactionSnapshot } from './transaction-revision';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly spacesService: SpacesService,
  ) {}

  async createOpeningBalance(
    userId: string,
    spaceId: string,
    accountId: string,
    dto: CreateOpeningBalanceDto,
  ): Promise<FinancialTransactionDto> {
    const account = await this.accountsService.requireWritableAccount(
      spaceId,
      accountId,
    );

    const existing = await this.prisma.financialTransaction.findFirst({
      where: {
        spaceId,
        accountId,
        type: TransactionType.OPENING_BALANCE,
      },
    });
    if (existing !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'OPENING_BALANCE_EXISTS',
        message: 'This account already has an opening balance',
      });
    }

    const amount = parseSignedMoneyAmount(dto.amount);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    const tx = await this.prisma.financialTransaction.create({
      data: {
        spaceId,
        type: TransactionType.OPENING_BALANCE,
        amount,
        currency: account.currency,
        description: dto.description,
        occurredAt,
        recordedByUserId: userId,
        accountId: account.id,
      },
    });

    return this.toDto(tx);
  }

  async createIncome(
    userId: string,
    spaceId: string,
    dto: CreateIncomeDto,
  ): Promise<FinancialTransactionDto> {
    await this.spacesService.requireActiveMembership(userId, spaceId);
    const account = await this.accountsService.requireWritableAccount(
      spaceId,
      dto.accountId,
    );
    const amount = parsePositiveMoneyAmount(dto.amount);
    await this.resolveCategory(spaceId, dto.categoryId, CategoryType.INCOME);

    const tx = await this.createPostedTransaction({
      userId,
      spaceId,
      type: TransactionType.INCOME,
      amount,
      currency: account.currency,
      description: dto.description,
      occurredAt: dto.occurredAt,
      categoryId: dto.categoryId,
      accountId: account.id,
      attributedToUserId: null,
    });

    return this.toDto(tx);
  }

  async createExpense(
    userId: string,
    spaceId: string,
    dto: CreateExpenseDto,
  ): Promise<FinancialTransactionDto> {
    const membership = await this.spacesService.requireActiveMembership(
      userId,
      spaceId,
    );
    const amount = parsePositiveMoneyAmount(dto.amount);
    await this.resolveCategory(spaceId, dto.categoryId, CategoryType.EXPENSE);

    if (membership.space.type === SpaceType.PERSONAL) {
      if (dto.accountId === undefined) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'ACCOUNT_REQUIRED',
          message: 'Personal expenses require an account',
        });
      }
      const account = await this.accountsService.requireWritableAccount(
        spaceId,
        dto.accountId,
      );
      const tx = await this.createPostedTransaction({
        userId,
        spaceId,
        type: TransactionType.EXPENSE,
        amount,
        currency: account.currency,
        description: dto.description,
        occurredAt: dto.occurredAt,
        categoryId: dto.categoryId,
        accountId: account.id,
        attributedToUserId: userId,
      });
      return this.toDto(tx);
    }

    const attributedToUserId = dto.attributedToUserId;
    if (attributedToUserId === undefined) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'ATTRIBUTION_REQUIRED',
        message: 'Shared expenses require attributedToUserId',
      });
    }
    await assertSharedExpenseAttribution(
      this.prisma,
      membership,
      attributedToUserId,
    );

    let accountId: string | null = null;
    let currency: string;

    if (dto.accountId !== undefined) {
      const account = await this.accountsService.requireWritableAccount(
        spaceId,
        dto.accountId,
      );
      accountId = account.id;
      currency = account.currency;
    } else {
      currency = membership.space.displayCurrency ?? dto.currency ?? '';
      if (!/^[A-Z]{3}$/.test(currency)) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'CURRENCY_REQUIRED',
          message:
            'Provide currency for expenses without account, or set space displayCurrency',
        });
      }
    }

    const tx = await this.createPostedTransaction({
      userId,
      spaceId,
      type: TransactionType.EXPENSE,
      amount,
      currency,
      description: dto.description,
      occurredAt: dto.occurredAt,
      categoryId: dto.categoryId,
      accountId,
      attributedToUserId,
    });

    return this.toDto(tx);
  }

  async createTransfer(
    userId: string,
    spaceId: string,
    dto: CreateTransferDto,
  ): Promise<FinancialTransactionDto> {
    await this.spacesService.requireActiveMembership(userId, spaceId);

    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'SAME_ACCOUNT_TRANSFER',
        message: 'Source and destination accounts must differ',
      });
    }

    const source = await this.accountsService.requireWritableAccount(
      spaceId,
      dto.sourceAccountId,
    );
    const destination = await this.accountsService.requireWritableAccount(
      spaceId,
      dto.destinationAccountId,
    );

    if (source.currency !== destination.currency) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'CURRENCY_MISMATCH',
        message: 'Transfer accounts must share the same currency',
      });
    }

    const amount = parsePositiveMoneyAmount(dto.amount);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    const tx = await this.prisma.financialTransaction.create({
      data: {
        spaceId,
        type: TransactionType.TRANSFER,
        amount,
        currency: source.currency,
        description: dto.description,
        occurredAt,
        recordedByUserId: userId,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
      },
    });

    return this.toDto(tx);
  }

  async listForSpace(
    actorUserId: string,
    spaceId: string,
    options: {
      accountId?: string;
      type?: TransactionType;
      limit?: number;
    },
  ): Promise<FinancialTransactionDto[]> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    const take = Math.min(options.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);

    const rows = await this.prisma.financialTransaction.findMany({
      where: {
        spaceId,
        voidedAt: null,
        ...(options.type !== undefined ? { type: options.type } : {}),
        ...(options.accountId !== undefined
          ? {
              OR: [
                { accountId: options.accountId },
                { sourceAccountId: options.accountId },
                { destinationAccountId: options.accountId },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    if (membership.space.type === SpaceType.PERSONAL) {
      return this.enrichPersonalSpaceDtos(actorUserId, rows);
    }
    return rows.map((row) => this.toDto(row));
  }

  async getInSpace(
    actorUserId: string,
    spaceId: string,
    transactionId: string,
  ): Promise<FinancialTransactionDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    const tx = await this.findTransactionInSpace(spaceId, transactionId);
    if (membership.space.type === SpaceType.PERSONAL) {
      const [dto] = await this.enrichPersonalSpaceDtos(actorUserId, [tx]);
      return dto;
    }
    return this.toDto(tx);
  }

  async updateInSpace(
    userId: string,
    spaceId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ): Promise<FinancialTransactionDto> {
    const hasPatch =
      dto.description !== undefined ||
      dto.occurredAt !== undefined ||
      dto.amount !== undefined ||
      dto.categoryId !== undefined;
    if (!hasPatch) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'NO_CHANGES',
        message:
          'At least one of description, occurredAt, amount or categoryId is required',
      });
    }

    return runWithVersionConflictMapping(() =>
      this.prisma.$transaction(async (tx) => {
        const current = await tx.financialTransaction.findFirst({
          where: { id: transactionId, spaceId },
        });
        if (current === null) {
          throw new NotFoundException({
            statusCode: 404,
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
          });
        }

        const linked = await tx.sharedExpense.findFirst({
          where: { financialTransactionId: transactionId },
        });
        if (linked !== null) {
          throw new ConflictException({
            statusCode: 409,
            code: 'TRANSACTION_LINKED_TO_SHARED_EXPENSE',
            message:
              'Cannot edit a payment transaction linked to a shared expense',
          });
        }

        if (current.version !== dto.expectedVersion) {
          throw new ConflictException({
            statusCode: 409,
            code: 'VERSION_CONFLICT',
            message: 'Transaction was modified by another request',
          });
        }

        if (dto.categoryId !== undefined && dto.categoryId !== null) {
          const expected =
            current.type === TransactionType.INCOME
              ? CategoryType.INCOME
              : CategoryType.EXPENSE;
          await this.resolveCategory(spaceId, dto.categoryId, expected);
        }

        const data: Prisma.FinancialTransactionUncheckedUpdateManyInput = {
          version: { increment: 1 },
        };

        if (dto.description !== undefined) {
          data.description = dto.description;
        }
        if (dto.occurredAt !== undefined) {
          data.occurredAt = new Date(dto.occurredAt);
        }
        if (dto.amount !== undefined) {
          data.amount = this.parseAmountForType(current.type, dto.amount);
        }
        if (dto.categoryId !== undefined) {
          data.categoryId = dto.categoryId;
        }

        const lastRev = await tx.financialRevision.findFirst({
          where: { financialTransactionId: transactionId },
          orderBy: { revisionNumber: 'desc' },
        });
        const revisionNumber = (lastRev?.revisionNumber ?? 0) + 1;

        await tx.financialRevision.create({
          data: {
            revisionNumber,
            snapshot: buildTransactionSnapshot(current),
            changedByUserId: userId,
            financialTransactionId: transactionId,
            reason: dto.reason,
          },
        });

        const updated = await tx.financialTransaction.updateMany({
          where: {
            id: transactionId,
            spaceId,
            version: dto.expectedVersion,
          },
          data,
        });

        if (updated.count === 0) {
          throw new ConflictException({
            statusCode: 409,
            code: 'VERSION_CONFLICT',
            message: 'Transaction was modified by another request',
          });
        }

        const row = await tx.financialTransaction.findFirstOrThrow({
          where: { id: transactionId, spaceId },
        });
        return this.toDto(row);
      }),
    );
  }

  private parseAmountForType(
    type: TransactionType,
    raw: string,
  ): Prisma.Decimal {
    if (type === TransactionType.OPENING_BALANCE) {
      return parseSignedMoneyAmount(raw);
    }
    return parsePositiveMoneyAmount(raw);
  }

  private async findTransactionInSpace(
    spaceId: string,
    transactionId: string,
  ): Promise<FinancialTransaction> {
    const tx = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, spaceId },
    });
    if (tx === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      });
    }
    return tx;
  }

  private async resolveCategory(
    spaceId: string,
    categoryId: string | undefined,
    expected: CategoryType,
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
    if (category.type !== expected) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_CATEGORY_TYPE',
        message: `Category must be of type ${expected}`,
      });
    }
  }

  private async createPostedTransaction(params: {
    userId: string;
    spaceId: string;
    type: 'INCOME' | 'EXPENSE';
    amount: ReturnType<typeof parsePositiveMoneyAmount>;
    currency: string;
    description?: string;
    occurredAt?: string;
    categoryId?: string;
    accountId: string | null;
    attributedToUserId: string | null;
  }): Promise<FinancialTransaction> {
    const occurredAt = params.occurredAt
      ? new Date(params.occurredAt)
      : new Date();

    return this.prisma.financialTransaction.create({
      data: {
        spaceId: params.spaceId,
        type: params.type,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        occurredAt,
        recordedByUserId: params.userId,
        accountId: params.accountId,
        categoryId: params.categoryId,
        attributedToUserId: params.attributedToUserId,
      },
    });
  }

  private async enrichPersonalSpaceDtos(
    viewerUserId: string,
    rows: FinancialTransaction[],
  ): Promise<FinancialTransactionDto[]> {
    const dtos = rows.map((row) => this.toDto(row));
    if (rows.length === 0) {
      return dtos;
    }

    const links = await this.prisma.crossSpaceCashLink.findMany({
      where: {
        ownerUserId: viewerUserId,
        personalTransactionId: { in: rows.map((row) => row.id) },
      },
      include: {
        sharedSpace: { select: { id: true, name: true } },
      },
    });

    const linkByPersonalTxId = new Map(
      links.map((link) => [link.personalTransactionId, link]),
    );

    for (let index = 0; index < rows.length; index++) {
      const link = linkByPersonalTxId.get(rows[index]!.id);
      if (link !== undefined) {
        dtos[index]!.crossSpaceSummary = this.mapCrossSpaceSummary(link);
      }
    }

    return dtos;
  }

  private mapCrossSpaceSummary(link: {
    kind: CrossSpaceSummaryDto['kind'];
    sharedSpaceId: string;
    sharedExpenseId: string | null;
    settlementId: string | null;
    contributionGroupId: string | null;
    sharedSpace: { name: string };
  }): CrossSpaceSummaryDto {
    return {
      kind: link.kind,
      sharedSpaceId: link.sharedSpaceId,
      sharedSpaceName: link.sharedSpace.name,
      ...(link.sharedExpenseId !== null
        ? { sharedExpenseId: link.sharedExpenseId }
        : {}),
      ...(link.settlementId !== null ? { settlementId: link.settlementId } : {}),
      ...(link.contributionGroupId !== null
        ? { contributionGroupId: link.contributionGroupId }
        : {}),
    };
  }

  private toDto(tx: FinancialTransaction): FinancialTransactionDto {
    return {
      id: tx.id,
      type: tx.type,
      amount: formatTransactionAmount(tx.amount),
      currency: tx.currency,
      description: tx.description ?? undefined,
      occurredAt: tx.occurredAt.toISOString(),
      spaceId: tx.spaceId,
      accountId: tx.accountId ?? undefined,
      sourceAccountId: tx.sourceAccountId ?? undefined,
      destinationAccountId: tx.destinationAccountId ?? undefined,
      categoryId: tx.categoryId,
      attributedToUserId: tx.attributedToUserId ?? undefined,
      version: tx.version,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }
}
