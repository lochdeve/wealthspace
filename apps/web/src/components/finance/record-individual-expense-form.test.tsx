import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Account } from '@/lib/api/finance-types';
import { ApiError } from '@/lib/api/errors';
import { createAttributedExpense } from '@/lib/api/transactions';
import { RecordIndividualExpenseForm } from './record-individual-expense-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/lib/api/transactions', () => ({
  createAttributedExpense: vi.fn(),
}));

const createMock = vi.mocked(createAttributedExpense);

const members = [
  { userId: 'ana', displayName: 'Ana', email: 'ana@test.dev', role: 'OWNER' as const },
  { userId: 'carlos', displayName: 'Carlos', email: 'carlos@test.dev', role: 'MEMBER' as const },
];

function account(id: string, overrides: Partial<Account> = {}): Account {
  return {
    id,
    name: `Cuenta ${id}`,
    currency: 'EUR',
    balance: '0.0000',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderForm(props: Partial<Parameters<typeof RecordIndividualExpenseForm>[0]> = {}) {
  return render(
    <RecordIndividualExpenseForm
      spaceId="space-1"
      currentUserId="ana"
      actorRole="OWNER"
      members={members}
      accounts={[account('a1'), account('a2', { archivedAt: '2026-11-01T00:00:00Z' })]}
      categories={[]}
      displayCurrency="EUR"
      {...props}
    />,
  );
}

describe('RecordIndividualExpenseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never calls the expense «compartido»', () => {
    const { container } = renderForm();
    expect(container).not.toHaveTextContent(/compartid/i);
    expect(screen.getByRole('button', { name: 'Registrar gasto individual' })).toBeInTheDocument();
  });

  it('defaults attribution to the current user and limits a MEMBER to themselves', () => {
    renderForm({ currentUserId: 'carlos', actorRole: 'MEMBER' });
    const select = screen.getByLabelText('Atribuido a');
    expect(select).toHaveValue('carlos');
    expect(select.querySelectorAll('option')).toHaveLength(1);
  });

  it('preselects an active account and ignores archived or unknown ones', () => {
    const { unmount } = renderForm({ defaultAccountId: 'a1' });
    expect(screen.getByLabelText('Cuenta (opcional)')).toHaveValue('a1');
    unmount();

    renderForm({ defaultAccountId: 'a2' });
    expect(screen.getByLabelText('Cuenta (opcional)')).toHaveValue('');
  });

  it('sends the attributed expense and returns to the transactions history', async () => {
    createMock.mockResolvedValueOnce({} as Awaited<ReturnType<typeof createAttributedExpense>>);
    renderForm({ defaultAccountId: 'a1' });

    fireEvent.change(screen.getByLabelText('Importe'), { target: { value: '12.50' } });
    fireEvent.change(screen.getByLabelText('Concepto (opcional)'), { target: { value: ' Pan ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto individual' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/spaces/space-1/transactions'));
    expect(createMock).toHaveBeenCalledWith('space-1', {
      amount: '12.50',
      attributedToUserId: 'ana',
      accountId: 'a1',
      currency: undefined,
      description: 'Pan',
      categoryId: undefined,
    });
  });

  it('shows an attribution error from the API next to its field', async () => {
    createMock.mockRejectedValueOnce(
      new ApiError(403, { code: 'ATTRIBUTION_NOT_ALLOWED', message: 'Members can only…' }),
    );
    renderForm();

    fireEvent.change(screen.getByLabelText('Importe'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto individual' }));

    const error = await screen.findByText('No puedes atribuir el gasto a esa persona.');
    expect(error).toHaveAttribute('id', 'individual-attributed-error');
    expect(screen.getByLabelText('Atribuido a')).toHaveAttribute('aria-invalid', 'true');
    expect(push).not.toHaveBeenCalled();
  });

  it('validates the amount locally before calling the API', () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Importe'), { target: { value: '-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto individual' }));

    expect(screen.getByText('Importe positivo con hasta 4 decimales.')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });
});
