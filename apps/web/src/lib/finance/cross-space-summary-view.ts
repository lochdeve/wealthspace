import type { CrossSpaceSummary } from '@/lib/api/finance-types';
import { sharedExpenseDetailHref, settlementsHref } from '@/lib/finance/routes';

export function crossSpaceSummaryLabel(summary: CrossSpaceSummary): string {
  const space = `«${summary.sharedSpaceName}»`;
  switch (summary.kind) {
    case 'SHARED_EXPENSE_MEMBER_PAYMENT':
      return `Relacionado con un gasto compartido en ${space}`;
    case 'SETTLEMENT_FROM_OUT':
      return `Salida vinculada a una liquidación en ${space}`;
    case 'SETTLEMENT_TO_IN':
      return `Cobro vinculado a una liquidación en ${space}`;
    case 'CONTRIBUTION_PAIR':
      return `Flujo con aportación a cuenta común en ${space}`;
    default:
      return `Relacionado con ${space}`;
  }
}

export function crossSpaceSummaryHref(summary: CrossSpaceSummary): string {
  if (summary.sharedExpenseId) {
    return sharedExpenseDetailHref(summary.sharedSpaceId, summary.sharedExpenseId);
  }
  if (summary.settlementId) {
    return settlementsHref(summary.sharedSpaceId);
  }
  return `/spaces/${summary.sharedSpaceId}/accounts`;
}
