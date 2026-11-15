import { render, screen, within } from '@testing-library/react';
import { SpaceFinanceNav } from './space-finance-nav';

describe('SpaceFinanceNav', () => {
  it('links to accounts, transactions and categories only', () => {
    render(<SpaceFinanceNav spaceId="space-1" />);
    const nav = screen.getByRole('navigation', { name: 'Finanzas del espacio' });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/spaces/space-1/accounts',
      '/spaces/space-1/transactions',
      '/spaces/space-1/categories',
    ]);
    expect(nav).not.toHaveTextContent(/compartid|gasto individual/i);
  });
});
