import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType, Prisma, type Budget } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';
import type { BudgetDto } from './dto/budget-response.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForSpace(
    spaceId: string,
    periodFrom?: string,
    periodTo?: string,
  ): Promise<BudgetDto[]> {
    const where: Prisma.BudgetWhereInput = { spaceId };
    if (periodFrom !== undefined || periodTo !== undefined) {
      const from = periodFrom !== undefined ? parseDateOnly(periodFrom) : null;
      const to = periodTo !== undefined ? parseDateOnly(periodTo) : null;
      if (from !== null && to !== null && from > to) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'INVALID_PERIOD_RANGE',
          message: 'periodFrom must not be after periodTo',
        });
      }
      if (from !== null) {
        where.periodEnd = { gte: from };
      }
      if (to !== null) {
        where.periodStart = { lte: to };
      }
    }

    const budgets = await this.prisma.budget.findMany({
      where,
      orderBy: [{ periodStart: 'desc' }, { name: 'asc' }],
    });
    return budgets.map((row) => this.toDto(row));
  }

  async createInSpace(spaceId: string, dto: CreateBudgetDto): Promise<BudgetDto> {
    const periodStart = parseDateOnly(dto.periodStart);
    const periodEnd = parseDateOnly(dto.periodEnd);
    this.assertValidPeriod(periodStart, periodEnd);
    const amount = parseMoney(dto.amount);
    await this.assertCategoryIfAny(spaceId, dto.categoryId);

    const budget = await this.prisma.budget.create({
      data: {
        spaceId,
        name: dto.name,
        amount,
        currency: dto.currency,
        periodStart,
        periodEnd,
        categoryId: dto.categoryId,
      },
    });
    return this.toDto(budget);
  }

  async updateInSpace(
    spaceId: string,
    budgetId: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetDto> {
    const existing = await this.prisma.budget.findFirst({
      where: { id: budgetId, spaceId },
    });
    if (existing === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'BUDGET_NOT_FOUND',
        message: 'Budget not found',
      });
    }

    if (
      dto.name === undefined &&
      dto.amount === undefined &&
      dto.currency === undefined &&
      dto.periodStart === undefined &&
      dto.periodEnd === undefined &&
      dto.categoryId === undefined
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'NO_CHANGES',
        message: 'At least one field must be provided',
      });
    }

    const periodStart =
      dto.periodStart !== undefined
        ? parseDateOnly(dto.periodStart)
        : existing.periodStart;
    const periodEnd =
      dto.periodEnd !== undefined
        ? parseDateOnly(dto.periodEnd)
        : existing.periodEnd;
    this.assertValidPeriod(periodStart, periodEnd);

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertCategoryIfAny(spaceId, dto.categoryId);
    }

    const amount =
      dto.amount !== undefined ? parseMoney(dto.amount) : existing.amount;

    const budget = await this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        amount,
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        periodStart,
        periodEnd,
        ...(dto.categoryId !== undefined
          ? { categoryId: dto.categoryId }
          : {}),
      },
    });
    return this.toDto(budget);
  }

  async deleteInSpace(spaceId: string, budgetId: string): Promise<void> {
    const existing = await this.prisma.budget.findFirst({
      where: { id: budgetId, spaceId },
    });
    if (existing === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'BUDGET_NOT_FOUND',
        message: 'Budget not found',
      });
    }
    await this.prisma.budget.delete({ where: { id: budgetId } });
  }

  private assertValidPeriod(periodStart: Date, periodEnd: Date): void {
    if (periodStart > periodEnd) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_BUDGET_PERIOD',
        message: 'periodStart must not be after periodEnd',
      });
    }
  }

  private async assertCategoryIfAny(
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
        message: 'Budget category must be EXPENSE',
      });
    }
  }

  private toDto(budget: Budget): BudgetDto {
    return {
      id: budget.id,
      name: budget.name,
      amount: budget.amount.toFixed(4),
      currency: budget.currency,
      periodStart: formatDateOnly(budget.periodStart),
      periodEnd: formatDateOnly(budget.periodEnd),
      categoryId: budget.categoryId ?? undefined,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseMoney(value: string): Prisma.Decimal {
  const amount = new Prisma.Decimal(value);
  if (amount.lte(0)) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_AMOUNT',
      message: 'amount must be greater than zero',
    });
  }
  return amount;
}