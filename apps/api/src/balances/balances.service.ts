import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SpaceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ActiveSpaceMembership } from '../spaces/spaces.service';
import { SpacesService } from '../spaces/spaces.service';
import { formatTransactionAmount } from '../transactions/money';
import {
  computeSpaceBalances,
  type CurrencyBalancesDto,
} from './compute-space-balances';
import type { SpaceBalancesDto } from './dto/space-balances.dto';

@Injectable()
export class BalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
  ) {}

  async getInSpace(
    actorUserId: string,
    spaceId: string,
  ): Promise<SpaceBalancesDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);
    const currencies = await this.computeForSpaceId(spaceId);
    return { currencies };
  }

  async pendingDebtBetween(
    spaceId: string,
    fromUserId: string,
    toUserId: string,
    currency: string,
  ): Promise<Prisma.Decimal> {
    const currencies = await this.computeForSpaceId(spaceId);
    const bucket = currencies.find((c) => c.currency === currency);
    if (bucket === undefined) {
      return new Prisma.Decimal(0);
    }
    const edge = bucket.debts.find(
      (d) => d.fromUserId === fromUserId && d.toUserId === toUserId,
    );
    if (edge === undefined) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(edge.amount);
  }

  private async computeForSpaceId(
    spaceId: string,
  ): Promise<CurrencyBalancesDto[]> {
    const expenses = await this.prisma.sharedExpense.findMany({
      where: { spaceId },
      include: { participants: true },
    });

    const settlements = await this.prisma.settlement.findMany({
      where: { spaceId },
    });

    return computeSpaceBalances(
      expenses.map((row) => ({
        paymentSource: row.paymentSource,
        paidByUserId: row.paidByUserId,
        currency: row.currency,
        voidedAt: row.voidedAt,
        participants: row.participants.map((p) => ({
          userId: p.userId,
          allocatedAmount: formatTransactionAmount(p.allocatedAmount),
        })),
      })),
      settlements.map((row) => ({
        fromUserId: row.fromUserId,
        toUserId: row.toUserId,
        amount: formatTransactionAmount(row.amount),
        currency: row.currency,
        voidedAt: row.voidedAt,
      })),
    );
  }

  private assertSharedSpace(membership: ActiveSpaceMembership): void {
    if (membership.space.type !== SpaceType.SHARED) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'SHARED_SPACE_REQUIRED',
        message: 'Balances are only available in SHARED spaces',
      });
    }
  }
}
