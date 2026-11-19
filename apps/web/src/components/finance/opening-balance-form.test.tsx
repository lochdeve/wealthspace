import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createOpeningBalance } from '@/lib/api/transactions';
import { OpeningBalanceForm } from './opening-balance-form';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/lib/api/transactions', () => ({
  createOpeningBalance: vi.fn(),
}));

const createMock = vi.mocked(createOpeningBalance);

describe('OpeningBalanceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts comma decimals and registers opening balance', async () => {
    createMock.mockResolvedValueOnce({
      id: 'tx-ob',
      type: 'OPENING_BALANCE',
      amount: '100.0000',
      currency: 'EUR',
      occurredAt: '',
      spaceId: 'space-1',
      accountId: 'acc-1',
      version: 1,
      createdAt: '',
      updatedAt: '',
    });
    render(<OpeningBalanceForm spaceId="space-1" accountId="acc-1" currency="EUR" />);
    fireEvent.change(screen.getByLabelText(/Importe/i), { target: { value: '100,5' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar saldo inicial/i }));
    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith(
      'space-1',
      'acc-1',
      expect.objectContaining({ amount: '100.5' }),
    );
    expect(refresh).toHaveBeenCalled();
  });
});
