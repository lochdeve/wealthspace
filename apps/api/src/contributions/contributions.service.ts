import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { SpaceType, TransactionType } from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { CrossSpaceCashLinksService } from '../cross-space-cash-links/cross-space-cash-links.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ActiveSpaceMembership } from '../spaces/spaces.service';
import { SpacesService } from '../spaces/spaces.service';
import { assertUserMemberAt } from '../shared-expenses/membership-at';
import { formatTransactionAmount, parsePositiveMoneyAmount } from '../transactions/money';
import type { CreateContributionDto } from './dto/create-contribution.dto';
import type { ContributionResponseDto } from './dto/contribution-response.dto';

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
    private readonly accountsService: AccountsService,
    private readonly crossSpaceCashLinksService: CrossSpaceCashLinksService,
  ) {}

  async createInSpace(
    actorUserId: string,
    spaceId: string,
    dto: CreateContributionDto,
  ): Promise<ContributionResponseDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const account = await this.accountsService.requireWritableAccount(
      spaceId,
      dto.sharedAccountId,
    );

    if (dto.currency !== account.currency) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'CROSS_SPACE_CURRENCY_MISMATCH',
        message: 'currency must match the shared account',
      });
    }

    const amount = parsePositiveMoneyAmount(dto.amount, 'amount');
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    await assertUserMemberAt(
      this.prisma,
      spaceId,
      actorUserId,
      occurredAt,
      'PARTICIPANT_NOT_MEMBER',
    );

    const contributionGroupId = randomUUID();
    const withPersonal = dto.personalAccountId !== undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const sharedTx = await tx.financialTransaction.create({
        data: {
          spaceId,
          type: TransactionType.INCOME,
          amount,
          currency: dto.currency,
          description: dto.note ?? null,
          occurredAt,
          recordedByUserId: actorUserId,
          accountId: account.id,
          attributedToUserId: withPersonal ? actorUserId : null,
        },
      });

      if (withPersonal) {
        await this.crossSpaceCashLinksService.createContributionPersonalLegInTransaction(
          tx,
          {
            ownerUserId: actorUserId,
            personalAccountId: dto.personalAccountId ?? '',
            sharedSpaceId: spaceId,
            contributionGroupId,
            amount,
            currency: dto.currency,
            occurredAt,
            recordedByUserId: actorUserId,
            description: dto.note ?? null,
          },
        );
      }

      return sharedTx;
    });

    return {
      sharedIncomeTransactionId: result.id,
      sharedAccountId: account.id,
      amount: formatTransactionAmount(amount),
      currency: dto.currency,
      occurredAt: result.occurredAt.toISOString(),
      ...(withPersonal
        ? {
            contributionGroupId,
            attributedToUserId: actorUserId,
          }
        : {}),
      personalLegLinked: withPersonal,
    };
  }

  private assertSharedSpace(membership: ActiveSpaceMembership): void {
    if (membership.space.type !== SpaceType.SHARED) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'SHARED_SPACE_REQUIRED',
        message: 'Contributions are only available in SHARED spaces',
      });
    }
  }
}