import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SpaceType, TransactionType } from '@prisma/client';
import {
  formatIsoDateInTimeZone,
  localMonthUtcBounds,
} from '../common/iana-timezone';
import { PrismaService } from '../prisma/prisma.service';
import type { ConsumptionReportDto } from './dto/consumption-report.dto';

type Bucket = { categoryId?: string; currency: string; amount: Prisma.Decimal };

@Injectable()
export class ConsumptionService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlyConsumptionReport(
    userId: string,
    spaceId: string,
    year: number,
    month: number,
    timezone: string,
  ): Promise<ConsumptionReportDto> {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (space === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'SPACE_NOT_FOUND',
        message: 'Space not found',
      });
    }

    const { startUtc, endUtcExclusive } = localMonthUtcBounds(
      year,
      month,
      timezone,
    );

    const periodStartLocal = formatIsoDateInTimeZone(startUtc, timezone);
    const periodEndLocal = formatIsoDateInTimeZone(
      new Date(endUtcExclusive.getTime() - 1),
      timezone,
    );

    const buckets: Bucket[] =
      space.type === SpaceType.PERSONAL
        ? await this.personalConsumption(spaceId, startUtc, endUtcExclusive)
        : await this.sharedConsumption(
            userId,
            spaceId,
            startUtc,
            endUtcExclusive,
          );

    const byCategoryMap = new Map<string, Bucket>();
    const totalMap = new Map<string, Prisma.Decimal>();

    for (const row of buckets) {
      const catKey = row.categoryId ?? '';
      const key = `${catKey}:${row.currency}`;
      const existing = byCategoryMap.get(key);
      if (existing === undefined) {
        byCategoryMap.set(key, {
          categoryId: row.categoryId,
          currency: row.currency,
          amount: row.amount,
        });
      } else {
        existing.amount = existing.amount.add(row.amount);
      }

      const prior = totalMap.get(row.currency);
      totalMap.set(
        row.currency,
        prior !== undefined ? prior.add(row.amount) : row.amount,
      );
    }

    return {
      year,
      month,
      timezone,
      periodStartLocal,
      periodEndLocal,
      totalsByCurrency: [...totalMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => ({
          currency,
          amount: amount.toFixed(4),
        })),
      byCategory: [...byCategoryMap.values()]
        .sort(
          (a, b) =>
            a.currency.localeCompare(b.currency) ||
            (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
        )
        .map((row) => ({
          categoryId: row.categoryId,
          currency: row.currency,
          amount: row.amount.toFixed(4),
        })),
    };
  }

  private async personalConsumption(
    spaceId: string,
    startUtc: Date,
    endUtcExclusive: Date,
  ): Promise<Bucket[]> {
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        spaceId,
        type: TransactionType.EXPENSE,
        voidedAt: null,
        occurredAt: { gte: startUtc, lt: endUtcExclusive },
        crossSpaceCashLink: null,
      },
      select: {
        amount: true,
        currency: true,
        categoryId: true,
      },
    });

    return transactions.map((tx) => ({
      categoryId: tx.categoryId ?? undefined,
      currency: tx.currency,
      amount: tx.amount,
    }));
  }

  private async sharedConsumption(
    userId: string,
    spaceId: string,
    startUtc: Date,
    endUtcExclusive: Date,
  ): Promise<Bucket[]> {
    const participantRows = await this.prisma.expenseParticipant.findMany({
      where: {
        userId,
        sharedExpense: {
          spaceId,
          voidedAt: null,
          occurredAt: { gte: startUtc, lt: endUtcExclusive },
        },
      },
      select: {
        allocatedAmount: true,
        sharedExpense: {
          select: { currency: true, categoryId: true },
        },
      },
    });

    const individualExpenses = await this.prisma.financialTransaction.findMany({
      where: {
        spaceId,
        type: TransactionType.EXPENSE,
        voidedAt: null,
        attributedToUserId: userId,
        occurredAt: { gte: startUtc, lt: endUtcExclusive },
        sharedExpensePayment: null,
      },
      select: {
        amount: true,
        currency: true,
        categoryId: true,
      },
    });

    const fromParticipants = participantRows.map((row) => ({
      categoryId: row.sharedExpense.categoryId ?? undefined,
      currency: row.sharedExpense.currency,
      amount: row.allocatedAmount,
    }));

    const fromTransactions = individualExpenses.map((tx) => ({
      categoryId: tx.categoryId ?? undefined,
      currency: tx.currency,
      amount: tx.amount,
    }));

    return [...fromParticipants, ...fromTransactions];
  }
}