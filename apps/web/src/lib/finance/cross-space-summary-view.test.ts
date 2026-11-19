import { describe, expect, it } from 'vitest';
import {
  crossSpaceSummaryHref,
  crossSpaceSummaryLabel,
} from '@/lib/finance/cross-space-summary-view';

const base = {
  sharedSpaceId: 'space-shared',
  sharedSpaceName: 'Viaje',
};

describe('cross-space-summary-view', () => {
  it('labels and links expense payments', () => {
    const summary = {
      ...base,
      kind: 'SHARED_EXPENSE_MEMBER_PAYMENT' as const,
      sharedExpenseId: 'exp-1',
    };
    expect(crossSpaceSummaryLabel(summary)).toContain('Viaje');
    expect(crossSpaceSummaryHref(summary)).toBe('/spaces/space-shared/expenses/exp-1');
  });

  it('links settlements list when only settlement id is known', () => {
    const summary = {
      ...base,
      kind: 'SETTLEMENT_TO_IN' as const,
      settlementId: 'stl-1',
    };
    expect(crossSpaceSummaryHref(summary)).toBe('/spaces/space-shared/settlements');
  });
});