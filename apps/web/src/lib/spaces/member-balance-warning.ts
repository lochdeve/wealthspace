import type { SpaceBalances } from '@/lib/api/balance-types';
import { memberNetSummary } from '@/lib/finance/balance-view';

function netIsNonZero(net: string): boolean {
  const value = Number.parseFloat(net);
  return Number.isFinite(value) && value !== 0;
}

export function userHasNonZeroNet(balances: SpaceBalances, userId: string): boolean {
  for (const bucket of balances.currencies) {
    const row = bucket.members.find((member) => member.userId === userId);
    if (row && netIsNonZero(row.net)) {
      return true;
    }
  }
  return false;
}

function pendingBalanceLines(balances: SpaceBalances, userId: string): string[] {
  const lines: string[] = [];
  for (const bucket of balances.currencies) {
    const row = bucket.members.find((member) => member.userId === userId);
    if (!row || !netIsNonZero(row.net)) {
      continue;
    }
    lines.push(`${bucket.currency}: ${memberNetSummary(row.net, bucket.currency)}`);
  }
  return lines;
}

/** Informative P-19 copy appended before leave/remove confirm (does not block). */
export function appendNonZeroNetBalanceNotice(
  baseMessage: string,
  balances: SpaceBalances,
  userId: string,
  subjectLabel: 'second' | 'third',
): string {
  const lines = pendingBalanceLines(balances, userId);
  if (lines.length === 0) {
    return baseMessage;
  }
  const possessive =
    subjectLabel === 'second'
      ? 'Tienes saldo pendiente en este espacio'
      : 'Tiene saldo pendiente en este espacio';
  return `${baseMessage}\n\n${possessive} (${lines.join('; ')}). Puedes salir igualmente y saldar después.`;
}