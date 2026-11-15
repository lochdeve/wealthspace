import { Prisma } from '@prisma/client';
import { AllocateError } from './allocate-error';
import { getCurrencyMinorUnits } from './iso4217-minor-units';

export type SplitMode = 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT';

export type AllocateParticipant = {
  userId: string;
  allocatedAmount: string;
};

export type EqualSplitInput = {
  mode: 'EQUAL';
  participantUserIds: string[];
};

export type PercentageSplitInput = {
  mode: 'PERCENTAGE';
  shares: { userId: string; percent: string }[];
};

export type FixedAmountSplitInput = {
  mode: 'FIXED_AMOUNT';
  shares: { userId: string; amount: string }[];
};

export type AllocateSplitInput =
  | EqualSplitInput
  | PercentageSplitInput
  | FixedAmountSplitInput;

const HUNDRED = new Prisma.Decimal(100);
const POSITIVE_MONEY = /^\d+(\.\d{1,4})?$/;
const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function allocate(
  totalAmount: string,
  currency: string,
  split: AllocateSplitInput,
): AllocateParticipant[] {
  const exponent = getCurrencyMinorUnits(currency);
  if (exponent === null) {
    throw new AllocateError(
      'CURRENCY_NOT_SUPPORTED',
      `Currency ${currency} is not supported`,
    );
  }

  const total = parseTotalAmount(totalAmount, exponent);
  const totalMinor = toMinorUnits(total, exponent);

  assertNoDuplicateUserIds(split);

  if (split.mode === 'FIXED_AMOUNT') {
    return allocateFixedAmount(total, totalMinor, exponent, split.shares);
  }

  const userIds = participantsFromSplit(split);
  if (userIds.length === 0) {
    throw new AllocateError(
      'INSUFFICIENT_PARTICIPANTS',
      'At least one participant is required',
    );
  }

  const weights = weightsFromSplit(split, userIds);
  const allocatedMinor = distributeLargestRemainder(
    totalMinor,
    userIds,
    weights,
  );
  return toParticipants(userIds, allocatedMinor, exponent);
}

function participantsFromSplit(split: AllocateSplitInput): string[] {
  if (split.mode === 'EQUAL') {
    return [...split.participantUserIds];
  }
  return split.shares.map((s) => s.userId);
}

function weightsFromSplit(
  split: EqualSplitInput | PercentageSplitInput,
  userIds: string[],
): Prisma.Decimal[] {
  if (split.mode === 'EQUAL') {
    return userIds.map(() => new Prisma.Decimal(1));
  }

  const byUser = new Map<string, Prisma.Decimal>();
  let sum = new Prisma.Decimal(0);
  for (const share of split.shares) {
    const percent = parsePositivePercent(share.percent);
    byUser.set(share.userId, percent);
    sum = sum.plus(percent);
  }
  if (!sum.equals(HUNDRED)) {
    throw new AllocateError(
      'SPLIT_PERCENT_SUM_INVALID',
      'Percentages must sum exactly to 100',
    );
  }

  return userIds.map((id) => {
    const w = byUser.get(id);
    if (w === undefined) {
      throw new AllocateError(
        'DUPLICATE_PARTICIPANT',
        'Duplicate or missing participant',
      );
    }
    return w;
  });
}

function allocateFixedAmount(
  total: Prisma.Decimal,
  totalMinor: bigint,
  exponent: number,
  shares: { userId: string; amount: string }[],
): AllocateParticipant[] {
  let sumMinor = 0n;
  const parts: AllocateParticipant[] = [];

  for (const share of shares) {
    if (!POSITIVE_MONEY.test(share.amount.trim())) {
      throw new AllocateError(
        'INVALID_AMOUNT',
        'Share amount must be a positive decimal with up to 4 fractional digits',
      );
    }
    const amount = new Prisma.Decimal(share.amount.trim());
    if (amount.lte(0)) {
      throw new AllocateError(
        'SPLIT_SHARE_ZERO',
        'Each participant share must be greater than zero',
      );
    }
    const minor = toMinorUnits(amount, exponent);
    if (minor <= 0n) {
      throw new AllocateError(
        'SPLIT_SHARE_ZERO',
        'A participant would receive zero after rounding',
      );
    }
    sumMinor += minor;
    parts.push({
      userId: share.userId,
      allocatedAmount: fromMinorUnits(minor, exponent),
    });
  }

  if (sumMinor !== totalMinor) {
    throw new AllocateError(
      'SPLIT_AMOUNT_SUM_INVALID',
      'Fixed amounts must sum exactly to the total',
    );
  }

  return parts;
}

function distributeLargestRemainder(
  totalMinor: bigint,
  userIds: string[],
  weights: Prisma.Decimal[],
): bigint[] {
  const weightSum = weights.reduce(
    (acc, w) => acc.plus(w),
    new Prisma.Decimal(0),
  );
  if (weightSum.lte(0)) {
    throw new AllocateError(
      'SPLIT_PERCENT_SUM_INVALID',
      'Invalid split weights',
    );
  }

  const totalD = new Prisma.Decimal(totalMinor.toString());
  const work = userIds.map((userId, index) => {
    const weight = weights[index] ?? new Prisma.Decimal(0);
    const exact = totalD.mul(weight).div(weightSum);
    const floorMinor = bigintFloor(exact);
    const remainder = exact.minus(new Prisma.Decimal(floorMinor.toString()));
    return { userId, floorMinor, remainder };
  });

  let allocated = work.reduce((sum, w) => sum + w.floorMinor, 0n);
  const remaining = totalMinor - allocated;
  if (remaining < 0n) {
    throw new AllocateError(
      'AMOUNT_PRECISION_INVALID',
      'Rounding error in split allocation',
    );
  }

  const ranked = [...work].sort((a, b) => {
    const remCmp = b.remainder.comparedTo(a.remainder);
    if (remCmp !== 0) {
      return remCmp;
    }
    return a.userId.localeCompare(b.userId);
  });

  const floors = new Map(work.map((w) => [w.userId, w.floorMinor]));
  for (let i = 0; i < Number(remaining); i += 1) {
    const entry = ranked[i];
    if (entry === undefined) {
      break;
    }
    floors.set(entry.userId, (floors.get(entry.userId) ?? 0n) + 1n);
    allocated += 1n;
  }

  if (allocated !== totalMinor) {
    throw new AllocateError(
      'AMOUNT_PRECISION_INVALID',
      'Could not distribute total to minor units',
    );
  }

  return userIds.map((id) => floors.get(id) ?? 0n);
}

function toParticipants(
  userIds: string[],
  minorAmounts: bigint[],
  exponent: number,
): AllocateParticipant[] {
  return userIds.map((userId, index) => {
    const minor = minorAmounts[index] ?? 0n;
    if (minor <= 0n) {
      throw new AllocateError(
        'SPLIT_SHARE_ZERO',
        'A participant would receive zero; adjust amount, participants or split',
      );
    }
    return {
      userId,
      allocatedAmount: fromMinorUnits(minor, exponent),
    };
  });
}

function parseTotalAmount(raw: string, exponent: number): Prisma.Decimal {
  const trimmed = raw.trim();
  if (!POSITIVE_MONEY.test(trimmed)) {
    throw new AllocateError(
      'INVALID_AMOUNT',
      'totalAmount must be a positive decimal with up to 4 fractional digits',
    );
  }
  const value = new Prisma.Decimal(trimmed);
  if (value.lte(0)) {
    throw new AllocateError(
      'INVALID_AMOUNT',
      'totalAmount must be greater than zero',
    );
  }
  assertScaleWithinExponent(value, exponent, 'totalAmount');
  return value;
}

function parsePositivePercent(raw: string): Prisma.Decimal {
  const trimmed = raw.trim();
  if (!PERCENT_PATTERN.test(trimmed)) {
    throw new AllocateError(
      'SPLIT_PERCENT_SUM_INVALID',
      'Each percent must have up to 2 decimal places',
    );
  }
  const value = new Prisma.Decimal(trimmed);
  if (value.lte(0)) {
    throw new AllocateError(
      'SPLIT_SHARE_ZERO',
      'Each percent must be greater than zero',
    );
  }
  assertScaleWithinExponent(value, 2, 'percent');
  return value;
}

function assertScaleWithinExponent(
  value: Prisma.Decimal,
  exponent: number,
  field: string,
): void {
  const factor = new Prisma.Decimal(10).pow(exponent);
  const scaled = value.mul(factor);
  if (!scaled.equals(scaled.trunc())) {
    throw new AllocateError(
      'AMOUNT_PRECISION_INVALID',
      `${field} has more decimal places than the currency allows`,
    );
  }
}

function toMinorUnits(amount: Prisma.Decimal, exponent: number): bigint {
  const factor = new Prisma.Decimal(10).pow(exponent);
  const scaled = amount.mul(factor);
  assertScaleWithinExponent(amount, exponent, 'amount');
  return BigInt(scaled.toFixed(0));
}

function bigintFloor(value: Prisma.Decimal): bigint {
  return BigInt(value.floor().toFixed(0));
}

function fromMinorUnits(minor: bigint, exponent: number): string {
  const factor = new Prisma.Decimal(10).pow(exponent);
  return new Prisma.Decimal(minor.toString()).div(factor).toFixed(4);
}

function assertNoDuplicateUserIds(split: AllocateSplitInput): void {
  const ids =
    split.mode === 'EQUAL'
      ? split.participantUserIds
      : split.shares.map((s) => s.userId);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new AllocateError(
        'DUPLICATE_PARTICIPANT',
        'Each participant may appear only once',
      );
    }
    seen.add(id);
  }
}
