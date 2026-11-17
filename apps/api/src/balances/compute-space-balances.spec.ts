import { PaymentSource } from '@prisma/client';
import {
  computeSpaceBalances,
  type SettlementBalanceInput,
  type SharedExpenseBalanceInput,
} from './compute-space-balances';

const ANA = '00000000-0000-4000-8000-000000000001';
const CARLOS = '00000000-0000-4000-8000-000000000002';
const MARIA = '00000000-0000-4000-8000-000000000003';

function equalSplitExpense(
  total: string,
  payerId: string,
  participantIds: string[],
): SharedExpenseBalanceInput {
  const each = (Number(total) / participantIds.length).toFixed(4);
  return {
    paymentSource: PaymentSource.MEMBER,
    paidByUserId: payerId,
    currency: 'EUR',
    voidedAt: null,
    participants: participantIds.map((userId) => ({
      userId,
      allocatedAmount: each,
    })),
  };
}

describe('computeSpaceBalances', () => {
  it('matches phase 6 reference: 120 EUR equal split paid by Ana', () => {
    const expenses: SharedExpenseBalanceInput[] = [
      equalSplitExpense('120.0000', ANA, [ANA, CARLOS, MARIA]),
    ];

    const balances = computeSpaceBalances(expenses, []);

    expect(balances).toHaveLength(1);
    const eur = balances[0];
    expect(eur?.currency).toBe('EUR');
    expect(eur?.debts).toEqual([
      {
        fromUserId: CARLOS,
        toUserId: ANA,
        amount: '40.0000',
      },
      {
        fromUserId: MARIA,
        toUserId: ANA,
        amount: '40.0000',
      },
    ]);
    expect(eur?.members).toEqual([
      { userId: ANA, net: '80.0000' },
      { userId: CARLOS, net: '-40.0000' },
      { userId: MARIA, net: '-40.0000' },
    ]);
  });

  it('applies settlement Carlos → Ana 15 (phase 7 example)', () => {
    const expenses: SharedExpenseBalanceInput[] = [
      equalSplitExpense('120.0000', ANA, [ANA, CARLOS, MARIA]),
    ];
    const settlements: SettlementBalanceInput[] = [
      {
        fromUserId: CARLOS,
        toUserId: ANA,
        amount: '15.0000',
        currency: 'EUR',
        active: true,
      },
    ];

    const eur = computeSpaceBalances(expenses, settlements)[0];
    expect(eur?.debts).toEqual([
      { fromUserId: CARLOS, toUserId: ANA, amount: '25.0000' },
      { fromUserId: MARIA, toUserId: ANA, amount: '40.0000' },
    ]);
    expect(eur?.members).toEqual([
      { userId: ANA, net: '65.0000' },
      { userId: CARLOS, net: '-25.0000' },
      { userId: MARIA, net: '-40.0000' },
    ]);
  });

  it('nets opposing debts between the same pair (roadmap criterion 3)', () => {
    const expenses: SharedExpenseBalanceInput[] = [
      equalSplitExpense('120.0000', ANA, [ANA, CARLOS, MARIA]),
      {
        paymentSource: PaymentSource.MEMBER,
        paidByUserId: CARLOS,
        currency: 'EUR',
        voidedAt: null,
        participants: [
          { userId: CARLOS, allocatedAmount: '20.0000' },
          { userId: ANA, allocatedAmount: '20.0000' },
        ],
      },
    ];

    const eur = computeSpaceBalances(expenses, [])[0];
    expect(eur?.debts).toEqual([
      { fromUserId: CARLOS, toUserId: ANA, amount: '20.0000' },
      { fromUserId: MARIA, toUserId: ANA, amount: '40.0000' },
    ]);
  });

  it('separates balances by currency', () => {
    const expenses: SharedExpenseBalanceInput[] = [
      {
        paymentSource: PaymentSource.MEMBER,
        paidByUserId: ANA,
        currency: 'EUR',
        voidedAt: null,
        participants: [
          { userId: ANA, allocatedAmount: '50.0000' },
          { userId: CARLOS, allocatedAmount: '50.0000' },
        ],
      },
      {
        paymentSource: PaymentSource.MEMBER,
        paidByUserId: ANA,
        currency: 'USD',
        voidedAt: null,
        participants: [
          { userId: ANA, allocatedAmount: '30.0000' },
          { userId: MARIA, allocatedAmount: '30.0000' },
        ],
      },
    ];

    const balances = computeSpaceBalances(expenses, []);
    expect(balances.map((b) => b.currency)).toEqual(['EUR', 'USD']);
    expect(balances[0]?.debts[0]?.amount).toBe('50.0000');
    expect(balances[1]?.debts[0]?.amount).toBe('30.0000');
  });

  it('excludes voided expenses and inactive settlements', () => {
    const expenses: SharedExpenseBalanceInput[] = [
      {
        ...equalSplitExpense('120.0000', ANA, [ANA, CARLOS, MARIA]),
        voidedAt: new Date(),
      },
    ];
    const settlements: SettlementBalanceInput[] = [
      {
        fromUserId: CARLOS,
        toUserId: ANA,
        amount: '15.0000',
        currency: 'EUR',
        active: false,
      },
    ];

    expect(computeSpaceBalances(expenses, settlements)).toEqual([]);
  });

  it('ignores SPACE_ACCOUNT expenses for debts (P-04)', () => {
    const expenses: SharedExpenseBalanceInput[] = [
      {
        paymentSource: PaymentSource.SPACE_ACCOUNT,
        paidByUserId: null,
        currency: 'EUR',
        voidedAt: null,
        participants: [
          { userId: ANA, allocatedAmount: '40.0000' },
          { userId: CARLOS, allocatedAmount: '40.0000' },
        ],
      },
    ];

    expect(computeSpaceBalances(expenses, [])).toEqual([]);
  });
});
