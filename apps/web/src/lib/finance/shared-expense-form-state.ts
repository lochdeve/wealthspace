import type { SharedExpenseDetail, SplitMode } from '@/lib/api/shared-expense-types';

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function splitStateFromDetail(expense: SharedExpenseDetail): {
  splitMode: SplitMode;
  participantIds: string[];
  percentageShares: Record<string, string>;
  fixedShares: Record<string, string>;
} {
  const participantIds = expense.participants.map((row) => row.userId);
  const percentageShares: Record<string, string> = {};
  const fixedShares: Record<string, string> = {};
  for (const row of expense.participants) {
    if (row.sharePercent) {
      percentageShares[row.userId] = row.sharePercent;
    }
    if (expense.splitMode === 'FIXED_AMOUNT') {
      fixedShares[row.userId] = row.allocatedAmount;
    }
  }
  return {
    splitMode: expense.splitMode,
    participantIds,
    percentageShares,
    fixedShares,
  };
}