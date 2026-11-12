import { Prisma } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Account } from '@prisma/client';
import type { CreateAccountDto } from './dto/create-account.dto';
import type {
  AccountDetailDto,
  AccountListItemDto,
} from './dto/account-response.dto';
import {
  computeAccountBalance,
  computeBalancesForAccounts,
  formatAccountBalance,
} from './account-balance';
import { PrismaService } from '../prisma/prisma.service';

const ZERO = new Prisma.Decimal(0);

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForSpace(
    spaceId: string,
    includeArchived: boolean,
  ): Promise<AccountListItemDto[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        spaceId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
    });

    const balances = await computeBalancesForAccounts(
      this.prisma,
      spaceId,
      accounts.map((a) => a.id),
    );

    return accounts.map((account) =>
      this.toListItem(account, balances.get(account.id) ?? ZERO),
    );
  }

  async createInSpace(
    spaceId: string,
    dto: CreateAccountDto,
  ): Promise<AccountDetailDto> {
    const account = await this.prisma.account.create({
      data: {
        spaceId,
        name: dto.name,
        currency: dto.currency,
      },
    });

    return this.toDetail(account, ZERO);
  }

  async getInSpace(
    spaceId: string,
    accountId: string,
  ): Promise<AccountDetailDto> {
    const account = await this.findAccountInSpace(spaceId, accountId);
    const balance = await computeAccountBalance(
      this.prisma,
      spaceId,
      accountId,
    );
    return this.toDetail(account, balance);
  }

  /** Active, non-archived account in the space (for postings). */
  async requireWritableAccount(
    spaceId: string,
    accountId: string,
  ): Promise<Account> {
    const account = await this.findAccountInSpace(spaceId, accountId);
    if (account.archivedAt !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ACCOUNT_ARCHIVED',
        message: 'Cannot post to an archived account',
      });
    }
    return account;
  }

  async archiveInSpace(spaceId: string, accountId: string): Promise<void> {
    const account = await this.findAccountInSpace(spaceId, accountId);
    if (account.archivedAt !== null) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ACCOUNT_ALREADY_ARCHIVED',
        message: 'Account is already archived',
      });
    }

    await this.prisma.account.update({
      where: { id: account.id },
      data: { archivedAt: new Date() },
    });
  }

  private async findAccountInSpace(
    spaceId: string,
    accountId: string,
  ): Promise<Account> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, spaceId },
    });
    if (account === null) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
    }
    return account;
  }

  private toListItem(
    account: Account,
    balance: Prisma.Decimal,
  ): AccountListItemDto {
    return {
      id: account.id,
      name: account.name,
      currency: account.currency,
      balance: formatAccountBalance(balance),
      archivedAt: account.archivedAt?.toISOString(),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private toDetail(
    account: Account,
    balance: Prisma.Decimal,
  ): AccountDetailDto {
    return this.toListItem(account, balance);
  }
}
