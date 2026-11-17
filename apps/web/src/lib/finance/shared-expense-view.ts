import type { GeneratedDebt, SharedExpenseParticipant, SplitMode } from '@/lib/api/shared-expense-types';
import { formatMoneyAmount } from '@/lib/finance/format-money';

const SPLIT_MODE_LABELS: Record<SplitMode, string> = {
  EQUAL: 'A partes iguales',
  PERCENTAGE: 'Por porcentajes',
  FIXED_AMOUNT: 'Por importes',
};

export function splitModeLabel(mode: SplitMode): string {
  return SPLIT_MODE_LABELS[mode];
}

export function findParticipantShare(
  viewerUserId: string,
  participants: SharedExpenseParticipant[],
): SharedExpenseParticipant | undefined {
  return participants.find((row) => row.userId === viewerUserId);
}

/** Short lines for the current viewer only (P-16 / F-6.3). */
export function viewerDebtLines(
  viewerUserId: string,
  currency: string,
  debts: GeneratedDebt[],
  displayName: (userId: string) => string,
): string[] {
  const lines: string[] = [];
  for (const debt of debts) {
    if (debt.fromUserId === viewerUserId) {
      lines.push(`Debes ${formatMoneyAmount(debt.amount, currency)} a ${displayName(debt.toUserId)}`);
    } else if (debt.toUserId === viewerUserId) {
      lines.push(`${displayName(debt.fromUserId)} te debe ${formatMoneyAmount(debt.amount, currency)}`);
    }
  }
  return lines;
}

export function expenseTitle(description: string | undefined): string {
  const trimmed = description?.trim();
  return trimmed ? trimmed : 'Gasto compartido';
}