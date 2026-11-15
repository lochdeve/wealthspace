import { SplitMode } from '@prisma/client';
import type { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import type { AllocateSplitInput } from './allocate';

export function toAllocateSplitInput(
  dto: CreateSharedExpenseDto['split'],
): AllocateSplitInput {
  switch (dto.mode) {
    case SplitMode.EQUAL:
      return {
        mode: 'EQUAL',
        participantUserIds: dto.participantUserIds,
      };
    case SplitMode.PERCENTAGE:
      return {
        mode: 'PERCENTAGE',
        shares: dto.shares.map((s) => ({
          userId: s.userId,
          percent: s.percent,
        })),
      };
    case SplitMode.FIXED_AMOUNT:
      return {
        mode: 'FIXED_AMOUNT',
        shares: dto.shares.map((s) => ({
          userId: s.userId,
          amount: s.amount,
        })),
      };
    default: {
      const _exhaustive: never = dto;
      return _exhaustive;
    }
  }
}

export function participantUserIdsFromSplit(
  split: CreateSharedExpenseDto['split'],
): string[] {
  switch (split.mode) {
    case SplitMode.EQUAL:
      return split.participantUserIds;
    case SplitMode.PERCENTAGE:
      return split.shares.map((s) => s.userId);
    case SplitMode.FIXED_AMOUNT:
      return split.shares.map((s) => s.userId);
    default: {
      const _exhaustive: never = split;
      return _exhaustive;
    }
  }
}
