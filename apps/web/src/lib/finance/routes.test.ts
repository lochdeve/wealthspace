import {
  individualExpenseHref,
  registerSettlementHref,
  settlementsHref,
  sharedExpenseDetailHref,
  sharedExpenseHref,
  sharedExpensesHref,
  spaceBalancesHref,
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
