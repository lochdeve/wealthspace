import { render, screen, within } from '@testing-library/react';
import { SpaceFinanceNav } from './space-finance-nav';

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

  it('exposes shared and individual expense entries in SHARED spaces (C-04)', () => {
    render(<SpaceFinanceNav spaceId="space-1" spaceType="SHARED" />);
    const nav = screen.getByRole('navigation', { name: 'Finanzas del espacio' });
    expect(within(nav).getByRole('link', { name: 'Gastos compartidos' })).toHaveAttribute(
      'href',
      '/spaces/space-1/expenses',
    );
    expect(within(nav).getByRole('link', { name: 'Registrar gasto compartido' })).toHaveAttribute(
      'href',
      '/spaces/space-1/expenses/new',
    );
    expect(within(nav).getByRole('link', { name: 'Gasto individual' })).toHaveAttribute(
      'href',
      '/spaces/space-1/expenses/individual/new',
    );
  });
});
