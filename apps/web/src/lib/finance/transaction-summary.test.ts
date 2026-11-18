import type { FinancialTransaction } from '@/lib/api/finance-types';
import { transactionContextLine } from './transaction-summary';

const base: FinancialTransaction = {
  id: 't1',
  type: 'EXPENSE',
  amount: '10.0000',
  currency: 'EUR',
  occurredAt: '2026-01-01T00:00:00.000Z',
  spaceId: 's1',
  accountId: 'acc-a',
  attributedToUserId: 'user-c',
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('transactionContextLine', () => {
  it('shows account and attributed member', () => {
    expect(
      transactionContextLine(
        base,
        (id) => (id === 'acc-a' ? 'Caja' : id),
        (id) => (id === 'user-c' ? 'Carlos' : id),
      ),
    ).toBe('Caja · Carlos');
  });

  it('shows transfer direction', () => {
    const transfer: FinancialTransaction = {
      ...base,
      type: 'TRANSFER',
      accountId: undefined,
      attributedToUserId: undefined,
      sourceAccountId: 'acc-a',
      destinationAccountId: 'acc-b',
    };
    expect(
      transactionContextLine(transfer, (id) => (id === 'acc-a' ? 'A' : 'B')),
    ).toBe('A → B');
  });
});