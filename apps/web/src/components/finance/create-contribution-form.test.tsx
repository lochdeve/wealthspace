import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createContribution } from '@/lib/api/contributions';
import type { Account } from '@/lib/api/finance-types';
import { CreateContributionForm } from './create-contribution-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/lib/api/contributions', () => ({
  createContribution: vi.fn(),
}));

const createMock = vi.mocked(createContribution);

const sharedAccount: Account = {
  id: 'shared-acc',
  name: 'Común',
  currency: 'EUR',
  balance: '0',
  createdAt: '',
  updatedAt: '',
};

const personalAccount: Account = {
  id: 'personal-1',
  name: 'Wallet',
  currency: 'EUR',
  balance: '0',
  createdAt: '',
  updatedAt: '',
};

describe('CreateContributionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({
      sharedIncomeTransactionId: 'tx-1',
      sharedAccountId: 'shared-acc',
      amount: '50.0000',
      currency: 'EUR',
      occurredAt: new Date().toISOString(),
      personalLegLinked: false,
    });
  });

  it('posts contribution without personal leg by default', async () => {
    render(
      <CreateContributionForm
        spaceId="space-1"
        sharedAccount={sharedAccount}
        currentUserId="user-1"
        personalAccounts={[personalAccount]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Importe'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aportación' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith('space-1', {
      sharedAccountId: 'shared-acc',
      amount: '50',
      currency: 'EUR',
      occurredAt: undefined,
      note: undefined,
    });
  });
});
