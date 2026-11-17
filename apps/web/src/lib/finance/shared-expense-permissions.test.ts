import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import { canMutateSharedExpense } from './shared-expense-permissions';

const base: Pick<SharedExpenseDetail, 'recordedByUserId' | 'payment'> = {
  recordedByUserId: 'recorder',
  payment: { source: 'MEMBER', paidByUserId: 'payer' },
};

describe('canMutateSharedExpense', () => {
  it('allows OWNER regardless of actor', () => {
    expect(canMutateSharedExpense('OWNER', 'other', base)).toBe(true);
  });

  it('allows the recorder', () => {
    expect(canMutateSharedExpense('MEMBER', 'recorder', base)).toBe(true);
  });

  it('allows the payer', () => {
    expect(canMutateSharedExpense('MEMBER', 'payer', base)).toBe(true);
  });

  it('denies unrelated members', () => {
    expect(canMutateSharedExpense('MEMBER', 'stranger', base)).toBe(false);
  });
});