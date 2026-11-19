import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CrossSpaceCashLinkKind,
  SpaceType,
  type Settlement,
} from '@prisma/client';
import { runWithVersionConflictMapping } from '../common/prisma-version-conflict';
import { BalancesService } from '../balances/balances.service';
import { CrossSpaceCashLinksService } from '../cross-space-cash-links/cross-space-cash-links.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ActiveSpaceMembership } from '../spaces/spaces.service';
import { SpacesService } from '../spaces/spaces.service';
import {
  formatTransactionAmount,
  parsePositiveMoneyAmount,
} from '../transactions/money';
import type { CreateSettlementDto } from './dto/create-settlement.dto';
import type { SettlementResponseDto } from './dto/settlement-response.dto';
import type { LinkPersonalCashFlowDto } from './dto/link-personal-cash-flow.dto';
import type { VoidSettlementDto } from './dto/void-settlement.dto';
import type { MyPersonalCashLinkSettlementDto } from './dto/settlement-response.dto';
import {
  assertSettlementRegisterAllowed,
  assertSettlementVoidAllowed,
} from './settlement-authorization';
import { buildSettlementSnapshot } from './settlement-revision';

const SETTLEMENT_WARNING_EXCEEDS = 'SETTLEMENT_EXCEEDS_PENDING_DEBT';

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
    private readonly balancesService: BalancesService,
    private readonly crossSpaceCashLinksService: CrossSpaceCashLinksService,
  ) {}

  async listInSpace(
    actorUserId: string,
    spaceId: string,
    options: { userId?: string; includeVoided?: boolean; limit: number },
  ): Promise<SettlementResponseDto[]> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const rows = await this.prisma.settlement.findMany({
      where: {
        spaceId,
        ...(options.includeVoided ? {} : { voidedAt: null }),
        ...(options.userId !== undefined
          ? {
              OR: [
                { fromUserId: options.userId },
                { toUserId: options.userId },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: options.limit,
    });

    const linkViews = await this.loadSettlementPersonalLinkViews(
      actorUserId,
      rows,
    );

    return rows.map((row) => this.toDto(row, undefined, linkViews.get(row.id)));
  }

  async createInSpace(
    actorUserId: string,
    spaceId: string,
    dto: CreateSettlementDto,
  ): Promise<SettlementResponseDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'SETTLEMENT_SAME_USER',
        message: 'from and to must be different users',
      });
    }

    assertSettlementRegisterAllowed(
      membership.role,
      actorUserId,
      dto.fromUserId,
      dto.toUserId,
    );

    await this.assertSettlementUsersValid(
      spaceId,
      dto.fromUserId,
      dto.toUserId,
      dto.occurredAt !== undefined ? new Date(dto.occurredAt) : new Date(),
    );

    const amount = parsePositiveMoneyAmount(dto.amount, 'amount');
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    const pending = await this.balancesService.pendingDebtBetween(
      spaceId,
      dto.fromUserId,
      dto.toUserId,
      dto.currency,
    );

    const warnings: string[] = [];
    if (amount.gt(pending)) {
      warnings.push(SETTLEMENT_WARNING_EXCEEDS);
    }

    const personalSide = this.resolvePersonalCashFlowSide(
      actorUserId,
      dto.fromUserId,
      dto.toUserId,
      dto.personalCashFlow?.accountId,
    );

    const row = await this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          spaceId,
          fromUserId: dto.fromUserId,
          toUserId: dto.toUserId,
          amount,
          currency: dto.currency,
          occurredAt,
          recordedByUserId: actorUserId,
        },
      });

      if (personalSide !== undefined) {
        await this.crossSpaceCashLinksService.createSettlementPersonalLinkInTransaction(
          tx,
          {
            kind: personalSide.kind,
            ownerUserId: actorUserId,
            personalAccountId: personalSide.accountId,
            sharedSpaceId: spaceId,
            settlementId: settlement.id,
            amount: settlement.amount,
            currency: settlement.currency,
            occurredAt: settlement.occurredAt,
            recordedByUserId: actorUserId,
          },
        );
      }

      return settlement;
    });

    const linkViews = await this.loadSettlementPersonalLinkViews(actorUserId, [
      row,
    ]);

    return this.toDto(
      row,
      warnings.length > 0 ? warnings : undefined,
      linkViews.get(row.id),
    );
  }

  async linkPersonalCashFlowInSpace(
    actorUserId: string,
    spaceId: string,
    settlementId: string,
    dto: LinkPersonalCashFlowDto,
  ): Promise<SettlementResponseDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const current = await this.findInSpace(spaceId, settlementId);

    if (current.voidedAt !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_VOIDED',
        message: 'Settlement is already voided',
      });
    }

    if (current.version !== dto.expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'Settlement was modified by another request',
      });
    }

    const side = this.settlementSideForUser(actorUserId, current);
    if (side === undefined) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PERSONAL_LINK_NOT_ALLOWED',
        message: 'Only a party of the settlement can link personal cash flow',
      });
    }

    const kind =
      side === 'from'
        ? CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT
        : CrossSpaceCashLinkKind.SETTLEMENT_TO_IN;

    await this.prisma.$transaction(async (tx) => {
      await this.crossSpaceCashLinksService.createSettlementPersonalLinkInTransaction(
        tx,
        {
          kind,
          ownerUserId: actorUserId,
          personalAccountId: dto.accountId,
          sharedSpaceId: spaceId,
          settlementId: current.id,
          amount: current.amount,
          currency: current.currency,
          occurredAt: current.occurredAt,
          recordedByUserId: actorUserId,
        },
      );
    });

    const row = await this.findInSpace(spaceId, settlementId);
    const linkViews = await this.loadSettlementPersonalLinkViews(actorUserId, [
      row,
    ]);
    return this.toDto(row, undefined, linkViews.get(row.id));
  }

  async voidInSpace(
    actorUserId: string,
    spaceId: string,
    settlementId: string,
    dto: VoidSettlementDto,
  ): Promise<SettlementResponseDto> {
    const membership = await this.spacesService.requireActiveMembership(
      actorUserId,
      spaceId,
    );
    this.assertSharedSpace(membership);

    const current = await this.findInSpace(spaceId, settlementId);
    assertSettlementVoidAllowed(membership.role, actorUserId, current);

    if (current.voidedAt !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_VOIDED',
        message: 'Settlement is already voided',
      });
    }

    if (current.version !== dto.expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'Settlement was modified by another request',
      });
    }

    const at = new Date();

    await runWithVersionConflictMapping(() =>
      this.prisma.$transaction(async (tx) => {
        const lastRev = await tx.financialRevision.findFirst({
          where: { settlementId: current.id },
          orderBy: { revisionNumber: 'desc' },
        });
        const revisionNumber = (lastRev?.revisionNumber ?? 0) + 1;

        await tx.financialRevision.create({
          data: {
            revisionNumber,
            snapshot: buildSettlementSnapshot(current),
            changedByUserId: actorUserId,
            settlementId: current.id,
            reason: dto.reason,
          },
        });

        await this.crossSpaceCashLinksService.voidAllLinksForSettlementInTransaction(
          tx,
          settlementId,
          actorUserId,
          at,
        );

        const updated = await tx.settlement.updateMany({
          where: {
            id: current.id,
            spaceId,
            version: dto.expectedVersion,
            voidedAt: null,
          },
          data: {
            voidedAt: at,
            voidedByUserId: actorUserId,
          },
        });

        if (updated.count === 0) {
          throw new ConflictException({
            statusCode: 409,
            code: 'VERSION_CONFLICT',
            message: 'Settlement was modified by another request',
          });
        }
      }),
    );

    const row = await this.findInSpace(spaceId, settlementId);
    const linkViews = await this.loadSettlementPersonalLinkViews(actorUserId, [
      row,
    ]);
    return this.toDto(row, undefined, linkViews.get(row.id));
  }

  private async findInSpace(
    spaceId: string,
    settlementId: string,
  ): Promise<Settlement> {
    const row = await this.prisma.settlement.findFirst({
      where: { id: settlementId, spaceId },
    });
    if (row === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'SETTLEMENT_NOT_FOUND',
        message: 'Settlement not found',
      });
    }
    return row;
  }

  private async assertSettlementUsersValid(
    spaceId: string,
    fromUserId: string,
    toUserId: string,
    occurredAt: Date,
  ): Promise<void> {
    for (const userId of [fromUserId, toUserId]) {
      const agg = await this.prisma.spaceMembership.aggregate({
        where: { spaceId, userId },
        _min: { joinedAt: true },
        _count: { _all: true },
      });
      if (agg._count._all === 0) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'SETTLEMENT_USER_NOT_MEMBER',
          message: 'User has no membership history in this space',
        });
      }
      const firstJoined = agg._min.joinedAt;
      if (firstJoined !== null && occurredAt < firstJoined) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'SETTLEMENT_USER_NOT_MEMBER',
          message: 'occurredAt is before user first joined the space',
        });
      }
    }
  }

  private assertSharedSpace(membership: ActiveSpaceMembership): void {
    if (membership.space.type !== SpaceType.SHARED) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'SHARED_SPACE_REQUIRED',
        message: 'Settlements are only available in SHARED spaces',
      });
    }
  }

  private resolvePersonalCashFlowSide(
    actorUserId: string,
    fromUserId: string,
    toUserId: string,
    accountId: string | undefined,
  ):
    | {
        kind:
          | typeof CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT
          | typeof CrossSpaceCashLinkKind.SETTLEMENT_TO_IN;
        accountId: string;
        side: 'from' | 'to';
      }
    | undefined {
    if (accountId === undefined) {
      return undefined;
    }
    if (actorUserId === fromUserId) {
      return {
        kind: CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT,
        accountId,
        side: 'from',
      };
    }
    if (actorUserId === toUserId) {
      return {
        kind: CrossSpaceCashLinkKind.SETTLEMENT_TO_IN,
        accountId,
        side: 'to',
      };
    }
    throw new ForbiddenException({
      statusCode: 403,
      code: 'PERSONAL_LINK_NOT_ALLOWED',
      message:
        'personalCashFlow is only allowed when you are the payer or payee',
    });
  }

  private settlementSideForUser(
    actorUserId: string,
    settlement: Pick<Settlement, 'fromUserId' | 'toUserId'>,
  ): 'from' | 'to' | undefined {
    if (actorUserId === settlement.fromUserId) {
      return 'from';
    }
    if (actorUserId === settlement.toUserId) {
      return 'to';
    }
    return undefined;
  }

  private async loadSettlementPersonalLinkViews(
    viewerUserId: string,
    rows: Settlement[],
  ): Promise<Map<string, MyPersonalCashLinkSettlementDto>> {
    const result = new Map<string, MyPersonalCashLinkSettlementDto>();
    const relevant = rows.filter(
      (row) => viewerUserId === row.fromUserId || viewerUserId === row.toUserId,
    );
    if (relevant.length === 0) {
      return result;
    }

    const settlementIds = relevant.map((r) => r.id);
    const links = await this.prisma.crossSpaceCashLink.findMany({
      where: {
        settlementId: { in: settlementIds },
        ownerUserId: viewerUserId,
        kind: {
          in: [
            CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT,
            CrossSpaceCashLinkKind.SETTLEMENT_TO_IN,
          ],
        },
        personalTransaction: { voidedAt: null },
      },
      select: { settlementId: true, kind: true },
    });

    const linkedKinds = new Map<string, CrossSpaceCashLinkKind>();
    for (const link of links) {
      if (link.settlementId !== null) {
        linkedKinds.set(link.settlementId, link.kind);
      }
    }

    for (const row of relevant) {
      const side = this.settlementSideForUser(viewerUserId, row);
      if (side === undefined) {
        continue;
      }
      const expectedKind =
        side === 'from'
          ? CrossSpaceCashLinkKind.SETTLEMENT_FROM_OUT
          : CrossSpaceCashLinkKind.SETTLEMENT_TO_IN;
      const linked = linkedKinds.get(row.id) === expectedKind;
      result.set(row.id, {
        linked,
        canLink: !linked && row.voidedAt === null,
        side,
      });
    }

    return result;
  }

  private toDto(
    row: Settlement,
    warnings?: string[],
    myPersonalCashLink?: MyPersonalCashLinkSettlementDto,
  ): SettlementResponseDto {
    return {
      id: row.id,
      fromUserId: row.fromUserId,
      toUserId: row.toUserId,
      amount: formatTransactionAmount(row.amount),
      currency: row.currency,
      occurredAt: row.occurredAt.toISOString(),
      recordedByUserId: row.recordedByUserId,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      version: row.version,
      ...(warnings !== undefined ? { warnings } : {}),
      ...(myPersonalCashLink !== undefined ? { myPersonalCashLink } : {}),
    };
  }
}
