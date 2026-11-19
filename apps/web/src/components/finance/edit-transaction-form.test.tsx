import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FinancialTransaction } from '@/lib/api/finance-types';
import { ApiError } from '@/lib/api/errors';
import { updateTransaction } from '@/lib/api/transactions';
import { EditTransactionForm } from './edit-transaction-form';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/lib/api/transactions', () => ({
  updateTransaction: vi.fn(),
}));

const updateMock = vi.mocked(updateTransaction);

const expenseTx: FinancialTransaction = {
  id: 'tx-1',
  type: 'EXPENSE',
  amount: '12.5000',
  currency: 'EUR',
  description: 'Cena',
  occurredAt: '2026-01-15T12:00:00.000Z',
  spaceId: 'space-1',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  version: 2,
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

const categories = [
  {
    id: 'cat-1',
    type: 'EXPENSE' as const,
    name: 'Comida',
    createdAt: '',
    updatedAt: '',
  },
];

describe('EditTransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success after save', async () => {
    updateMock.mockResolvedValueOnce(expenseTx);
    render(
      <EditTransactionForm spaceId="space-1" transaction={expenseTx} categories={categories} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent(/Cambios guardados/);
    expect(refresh).toHaveBeenCalled();
  });

  it('refreshes on version conflict', async () => {
    updateMock.mockRejectedValueOnce(new ApiError(409, { code: 'VERSION_CONFLICT' }));
    render(
      <EditTransactionForm spaceId="space-1" transaction={expenseTx} categories={categories} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
