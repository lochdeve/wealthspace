import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSettlement } from '@/lib/api/settlements';
import { RegisterSettlementForm } from './register-settlement-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/lib/api/settlements', () => ({
  createSettlement: vi.fn(),
}));

const createMock = vi.mocked(createSettlement);

const personalAccount = {
  id: 'personal-1',
  name: 'Wallet',
  currency: 'EUR',
  balance: '0',
  createdAt: '',
  updatedAt: '',
};

const members = [
  {
    userId: 'carlos',
    displayName: 'Carlos',
    email: 'c@test.dev',
    role: 'MEMBER' as const,
    joinedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    userId: 'ana',
    displayName: 'Ana',
    email: 'a@test.dev',
    role: 'OWNER' as const,
    joinedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('RegisterSettlementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a payment and redirects with warning query when needed', async () => {
    createMock.mockResolvedValueOnce({
      id: 'stl-1',
      fromUserId: 'carlos',
      toUserId: 'ana',
      amount: '20.0000',
      currency: 'EUR',
      occurredAt: '',
      recordedByUserId: 'carlos',
      version: 1,
      warnings: ['SETTLEMENT_EXCEEDS_PENDING_DEBT'],
    });
    render(
      <RegisterSettlementForm
        spaceId="space-1"
        currentUserId="carlos"
        actorRole="MEMBER"
        members={members}
        personalAccounts={[personalAccount]}
        defaultFromUserId="carlos"
        defaultToUserId="ana"
        defaultAmount="20"
        defaultCurrency="EUR"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith(
      '/spaces/space-1/settlements?warning=SETTLEMENT_EXCEEDS_PENDING_DEBT',
    );
  });

  it('sends personalCashFlow when debtor annotates personal account', async () => {
    createMock.mockResolvedValueOnce({
      id: 'stl-2',
      fromUserId: 'carlos',
      toUserId: 'ana',
      amount: '15.0000',
      currency: 'EUR',
      occurredAt: '',
      recordedByUserId: 'carlos',
      version: 1,
    });
    render(
      <RegisterSettlementForm
        spaceId="space-1"
        currentUserId="carlos"
        actorRole="MEMBER"
        members={members}
        personalAccounts={[personalAccount]}
        defaultFromUserId="carlos"
        defaultToUserId="ana"
        defaultAmount="15"
        defaultCurrency="EUR"
      />,
    );

    fireEvent.click(screen.getByLabelText(/Anotar en mi cuenta personal/i));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0]?.[1]).toMatchObject({
      personalCashFlow: { accountId: 'personal-1' },
    });
  });
});