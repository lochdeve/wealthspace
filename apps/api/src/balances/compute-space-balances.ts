import { Prisma } from '@prisma/client';
import { PaymentSource } from '@prisma/client';
import { computeGeneratedDebts } from '../shared-expenses/generated-debts';

const ZERO = new Prisma.Decimal(0);

function formatAmount(value: Prisma.Decimal): string {
  return value.toFixed(4);
}

export type SharedExpenseBalanceInput = {
  paymentSource: PaymentSource;
  paidByUserId: string | null;
  currency: string;
  voidedAt: Date | null;
  participants: { userId: string; allocatedAmount: string }[];
};

export type SettlementBalanceInput = {
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
  /** Until B-7.0: `true` when `status === CONFIRMED`; later use `voidedAt === null`. */
  active: boolean;
};

export type PairDebtDto = {
  fromUserId: string;
  toUserId: string;
  amount: string;
};

export type MemberNetDto = {
  userId: string;
  net: string;
};

export type CurrencyBalancesDto = {
  currency: string;
  debts: PairDebtDto[];
  members: MemberNetDto[];
};

type DirectedKey = `${string}\t${string}`;

function edgeKey(fromUserId: string, toUserId: string): DirectedKey {
  return `${fromUserId}\t${toUserId}`;
}

function addDirected(
  map: Map<DirectedKey, Prisma.Decimal>,
  fromUserId: string,
  toUserId: string,
  delta: Prisma.Decimal,
): void {
  const key = edgeKey(fromUserId, toUserId);
  const current = map.get(key) ?? ZERO;
  map.set(key, current.plus(delta));
}

function subtractDirected(
  map: Map<DirectedKey, Prisma.Decimal>,
  fromUserId: string,
  toUserId: string,
  delta: Prisma.Decimal,
): void {
  addDirected(map, fromUserId, toUserId, delta.negated());
}

export function computeSpaceBalances(
  expenses: SharedExpenseBalanceInput[],
  settlements: SettlementBalanceInput[],
): CurrencyBalancesDto[] {
  const byCurrency = new Map<string, Map<DirectedKey, Prisma.Decimal>>();
  const membersByCurrency = new Map<string, Set<string>>();

  const touchMember = (currency: string, userId: string): void => {
    let set = membersByCurrency.get(currency);
    if (set === undefined) {
      set = new Set();
      membersByCurrency.set(currency, set);
    }
    set.add(userId);
  };

  for (const expense of expenses) {
    if (expense.voidedAt !== null) {
      continue;
    }

    const paymentSource =
      expense.paymentSource === PaymentSource.MEMBER
        ? 'MEMBER'
        : 'SPACE_ACCOUNT';

    const generated = computeGeneratedDebts(
      paymentSource,
      expense.paidByUserId,
      expense.participants,
    );

    if (generated.length === 0) {
      continue;
    }

    for (const participant of expense.participants) {
      touchMember(expense.currency, participant.userId);
    }
    if (expense.paidByUserId !== null) {
      touchMember(expense.currency, expense.paidByUserId);
    }

    let directed = byCurrency.get(expense.currency);
    if (directed === undefined) {
      directed = new Map();
      byCurrency.set(expense.currency, directed);
    }

    for (const debt of generated) {
      addDirected(
        directed,
        debt.fromUserId,
        debt.toUserId,
        new Prisma.Decimal(debt.amount),
      );
    }
  }

  for (const settlement of settlements) {
    if (!settlement.active) {
      continue;
    }

    touchMember(settlement.currency, settlement.fromUserId);
    touchMember(settlement.currency, settlement.toUserId);

    let directed = byCurrency.get(settlement.currency);
    if (directed === undefined) {
      directed = new Map();
      byCurrency.set(settlement.currency, directed);
    }

    subtractDirected(
      directed,
      settlement.fromUserId,
      settlement.toUserId,
      new Prisma.Decimal(settlement.amount),
    );
  }

  const currencies = [...byCurrency.keys()].sort();

  return currencies.map((currency) => {
    const directed =
      byCurrency.get(currency) ?? new Map<DirectedKey, Prisma.Decimal>();
    const debts = netPairDebts(directed);
    const members = memberNetsFromDebts(
      membersByCurrency.get(currency) ?? new Set(),
      debts,
    );

    return { currency, debts, members };
  });
}

function netPairDebts(
  directed: Map<DirectedKey, Prisma.Decimal>,
): PairDebtDto[] {
  const seenPairs = new Set<string>();
  const result: PairDebtDto[] = [];

  for (const [key, gross] of directed) {
    if (gross.eq(0)) {
      continue;
    }
    const [fromUserId, toUserId] = key.split('\t');
    if (fromUserId === undefined || toUserId === undefined) {
      continue;
    }

    const pairKey =
      fromUserId < toUserId
        ? `${fromUserId}|${toUserId}`
        : `${toUserId}|${fromUserId}`;
    if (seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    const reverse = directed.get(edgeKey(toUserId, fromUserId)) ?? ZERO;
    const forward = fromUserId < toUserId ? gross : reverse;
    const backward = fromUserId < toUserId ? reverse : gross;

    const netForward = forward.minus(backward);
    if (netForward.gt(0)) {
      const debtor = fromUserId < toUserId ? fromUserId : toUserId;
      const creditor = fromUserId < toUserId ? toUserId : fromUserId;
      result.push({
        fromUserId: debtor,
        toUserId: creditor,
        amount: formatAmount(netForward),
      });
    } else if (netForward.lt(0)) {
      const debtor = fromUserId < toUserId ? toUserId : fromUserId;
      const creditor = fromUserId < toUserId ? fromUserId : toUserId;
      result.push({
        fromUserId: debtor,
        toUserId: creditor,
        amount: formatAmount(netForward.negated()),
      });
    }
  }

  result.sort((a, b) =>
    a.fromUserId === b.fromUserId
      ? a.toUserId.localeCompare(b.toUserId)
      : a.fromUserId.localeCompare(b.fromUserId),
  );

  return result;
}

function memberNetsFromDebts(
  memberIds: Set<string>,
  debts: PairDebtDto[],
): MemberNetDto[] {
  const nets = new Map<string, Prisma.Decimal>(
    [...memberIds].map((id) => [id, ZERO]),
  );

  for (const debt of debts) {
    const amount = new Prisma.Decimal(debt.amount);
    const fromNet = nets.get(debt.fromUserId) ?? ZERO;
    const toNet = nets.get(debt.toUserId) ?? ZERO;
    nets.set(debt.fromUserId, fromNet.minus(amount));
    nets.set(debt.toUserId, toNet.plus(amount));
  }

  return [...nets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([userId, net]) => ({
      userId,
      net: formatAmount(net),
    }));
}
