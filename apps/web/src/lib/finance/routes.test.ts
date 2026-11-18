import {
  consumptionReportHref,
  individualExpenseHref,
  registerSettlementHref,
  settlementsHref,
  sharedExpenseDetailHref,
  sharedExpenseHref,
  sharedExpensesHref,
  spaceBalancesHref,
  spaceBudgetsHref,
  spaceTransactionsHref,
} from './routes';

describe('individualExpenseHref', () => {
  it('points to the individual expense form of the space', () => {
    expect(individualExpenseHref('space-1')).toBe('/spaces/space-1/expenses/individual/new');
  });

  it('preselects the account when given', () => {
    expect(individualExpenseHref('space-1', 'acc-1')).toBe(
      '/spaces/space-1/expenses/individual/new?accountId=acc-1',
    );
  });
});

describe('sharedExpenseHref', () => {
  it('points to the shared expense form', () => {
    expect(sharedExpenseHref('space-1')).toBe('/spaces/space-1/expenses/new');
  });
});

describe('sharedExpensesHref', () => {
  it('lists shared expenses', () => {
    expect(sharedExpensesHref('space-1')).toBe('/spaces/space-1/expenses');
  });

  it('can include voided', () => {
    expect(sharedExpensesHref('space-1', { includeVoided: true })).toBe(
      '/spaces/space-1/expenses?includeVoided=1',
    );
  });
});

describe('sharedExpenseDetailHref', () => {
  it('points to expense detail', () => {
    expect(sharedExpenseDetailHref('space-1', 'exp-9')).toBe('/spaces/space-1/expenses/exp-9');
  });
});

describe('spaceTransactionsHref', () => {
  it('filters by account', () => {
    expect(spaceTransactionsHref('space-1', { accountId: 'acc-9' })).toBe(
      '/spaces/space-1/transactions?accountId=acc-9',
    );
  });
});

describe('spaceBalancesHref', () => {
  it('points to balances view', () => {
    expect(spaceBalancesHref('space-1')).toBe('/spaces/space-1/balances');
  });
});

describe('settlementsHref', () => {
  it('lists settlements', () => {
    expect(settlementsHref('space-1')).toBe('/spaces/space-1/settlements');
  });
});

describe('spaceBudgetsHref', () => {
  it('points to budgets page', () => {
    expect(spaceBudgetsHref('space-1')).toBe('/spaces/space-1/budgets');
  });
});

describe('consumptionReportHref', () => {
  it('accepts year and month query', () => {
    expect(consumptionReportHref('space-1', { year: 2026, month: 11 })).toBe(
      '/spaces/space-1/reports/consumption?year=2026&month=11',
    );
  });
});

describe('registerSettlementHref', () => {
  it('prefills debtor, creditor and amount', () => {
    expect(
      registerSettlementHref('space-1', {
        fromUserId: 'a',
        toUserId: 'b',
        amount: '25.0000',
        currency: 'EUR',
      }),
    ).toBe(
      '/spaces/space-1/settlements/new?fromUserId=a&toUserId=b&amount=25.0000&currency=EUR',
    );
  });
});
