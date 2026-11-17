import { render, screen, within } from '@testing-library/react';
import { SpaceFinanceNav } from './space-finance-nav';

function linksHref(nav: HTMLElement): string[] {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
    .filter((href): href is string => href !== null);
}

describe('SpaceFinanceNav', () => {
  it('links to accounts, transactions and categories in any space', () => {
    render(<SpaceFinanceNav spaceId="space-1" spaceType="PERSONAL" />);
    const nav = screen.getByRole('navigation', { name: 'Finanzas del espacio' });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Cuentas', '/spaces/space-1/accounts'],
      ['Movimientos', '/spaces/space-1/transactions'],
      ['Categorías', '/spaces/space-1/categories'],
    ]);
  });

  it('exposes shared finance entries in SHARED spaces (C-04, F-7)', () => {
    render(<SpaceFinanceNav spaceId="space-1" spaceType="SHARED" />);
    const nav = screen.getByRole('navigation', { name: 'Finanzas del espacio' });
    expect(linksHref(nav)).toEqual([
      '/spaces/space-1/accounts',
      '/spaces/space-1/transactions',
      '/spaces/space-1/categories',
      '/spaces/space-1/expenses',
      '/spaces/space-1/expenses/new',
      '/spaces/space-1/balances',
      '/spaces/space-1/settlements',
      '/spaces/space-1/expenses/individual/new',
    ]);
  });
});
