import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import { splitStateFromDetail } from './shared-expense-form-state';

const expense: SharedExpenseDetail = {
  id: 'exp-1',
  totalAmount: '90.0000',
  currency: 'EUR',
  occurredAt: '2026-01-01T12:00:00.000Z',
  splitMode: 'PERCENTAGE',
  payment: { source: 'MEMBER', paidByUserId: 'a' },
  participants: [
    { userId: 'a', displayName: 'A', allocatedAmount: '60.0000', sharePercent: '66.6700' },
    { userId: 'b', displayName: 'B', allocatedAmount: '30.0000', sharePercent: '33.3300' },
  ],
  generatedDebts: [],
  recordedByUserId: 'a',
  version: 2,
};

describe('splitStateFromDetail', () => {
  it('maps participants to split state', () => {
    expect(splitStateFromDetail(expense)).toEqual({
      splitMode: 'PERCENTAGE',
      participantIds: ['a', 'b'],
      percentageShares: { a: '66.6700', b: '33.3300' },
      fixedShares: {},
    });
  });
});