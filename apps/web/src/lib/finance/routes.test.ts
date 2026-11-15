import { individualExpenseHref } from './routes';

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
