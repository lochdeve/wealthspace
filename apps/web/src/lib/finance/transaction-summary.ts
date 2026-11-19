import type { FinancialTransaction } from '@/lib/api/finance-types';

export function transactionContextLine(
  tx: FinancialTransaction,
  resolveAccountName: (accountId: string) => string,
  resolveMemberName?: (userId: string) => string,
): string | null {
  if (tx.type === 'TRANSFER' && tx.sourceAccountId && tx.destinationAccountId) {
    return `${resolveAccountName(tx.sourceAccountId)} → ${resolveAccountName(tx.destinationAccountId)}`;
  }

  const accountId = tx.accountId ?? tx.sourceAccountId ?? tx.destinationAccountId;
  const parts: string[] = [];
  if (accountId) {
    parts.push(resolveAccountName(accountId));
  }
  if (tx.attributedToUserId && resolveMemberName) {
    parts.push(resolveMemberName(tx.attributedToUserId));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
