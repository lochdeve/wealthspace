import { Prisma, TransactionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const ZERO = new Prisma.Decimal(0);

function signedAmount(
  type: TransactionType,
  amount: Prisma.Decimal,
  accountId: string,
  row: {
    accountId: string | null;
    sourceAccountId: string | null;
    destinationAccountId: string | null;
  },
): Prisma.Decimal {
  switch (type) {
    case TransactionType.OPENING_BALANCE:
      return row.accountId === accountId ? amount : ZERO;
    case TransactionType.INCOME:
      return row.accountId === accountId ? amount : ZERO;
    case TransactionType.EXPENSE:
      return row.accountId === accountId ? amount.negated() : ZERO;
    case TransactionType.TRANSFER:
      if (row.sourceAccountId === accountId) {
        return amount.negated();
      }
      if (row.destinationAccountId === accountId) {
        return amount;
      }
      return ZERO;
    default:
      return ZERO;
  }
}

export function formatAccountBalance(value: Prisma.Decimal): string {
  return value.toFixed(4);
}

export async function computeAccountBalance(
  prisma: PrismaService,
  spaceId: string,
  accountId: string,
): Promise<Prisma.Decimal> {
  const rows = await prisma.financialTransaction.findMany({
    where: {
      spaceId,
      OR: [
        { accountId },
        { sourceAccountId: accountId },
        { destinationAccountId: accountId },
      ],
    },
    select: {
      type: true,
      amount: true,
      accountId: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  return rows.reduce(
    (total, row) =>
      total.plus(signedAmount(row.type, row.amount, accountId, row)),
    ZERO,
  );
}

export async function computeBalancesForAccounts(
  prisma: PrismaService,
  spaceId: string,
  accountIds: string[],
): Promise<Map<string, Prisma.Decimal>> {
  if (accountIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.financialTransaction.findMany({
    where: {
      spaceId,
      OR: [
        { accountId: { in: accountIds } },
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    select: {
      type: true,
      amount: true,
      accountId: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  const balances = new Map<string, Prisma.Decimal>(
    accountIds.map((id) => [id, ZERO]),
  );

  for (const row of rows) {
    for (const accountId of accountIds) {
      const delta = signedAmount(row.type, row.amount, accountId, row);
      if (!delta.isZero()) {
        const current = balances.get(accountId) ?? ZERO;
        balances.set(accountId, current.plus(delta));
      }
    }
  }

  return balances;
}
