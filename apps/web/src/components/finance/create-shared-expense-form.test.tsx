import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Account } from '@/lib/api/finance-types';
import { createSharedExpense, previewSharedExpense } from '@/lib/api/shared-expenses';
import { CreateSharedExpenseForm } from './create-shared-expense-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/lib/api/shared-expenses', () => ({
  createSharedExpense: vi.fn(),
  previewSharedExpense: vi.fn(),
}));

const createMock = vi.mocked(createSharedExpense);
const previewMock = vi.mocked(previewSharedExpense);

const members = [
  { userId: 'ana', displayName: 'Ana', email: 'a@test.dev', role: 'OWNER' as const },
  { userId: 'carlos', displayName: 'Carlos', email: 'c@test.dev', role: 'MEMBER' as const },
];

function account(id: string): Account {
  return {
    id,
    name: 'Común',
    currency: 'EUR',
    balance: '0.0000',
    createdAt: '',
    updatedAt: '',
  };
}

function renderForm(props: Partial<Parameters<typeof CreateSharedExpenseForm>[0]> = {}) {
  return render(
    <CreateSharedExpenseForm
      spaceId="space-1"
      currentUserId="ana"
      actorRole="OWNER"
      members={members}
      accounts={[account('acc-1')]}
      categories={[]}
      displayCurrency="EUR"
      {...props}
    />,
  );
}

describe('CreateSharedExpenseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewMock.mockResolvedValue({
      id: 'preview',
      participants: [],
      generatedDebts: [],
    } as unknown as Awaited<ReturnType<typeof previewSharedExpense>>);
  });

  it('defaults to payer self, all participants and EQUAL split payload', async () => {
    createMock.mockResolvedValueOnce({ id: 'exp-1' } as Awaited<
      ReturnType<typeof createSharedExpense>
    >);
    renderForm();

    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: 'Compra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto compartido' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith('space-1', {
      totalAmount: '120',
      description: 'Compra',
      categoryId: undefined,
      occurredAt: undefined,
      payment: { source: 'MEMBER', paidByUserId: 'ana' },
      split: { mode: 'EQUAL', participantUserIds: ['ana', 'carlos'] },
    });
    expect(push).toHaveBeenCalledWith('/spaces/space-1/expenses/exp-1');
  });

  it('limits payer selection for MEMBER role', () => {
    renderForm({ currentUserId: 'carlos', actorRole: 'MEMBER' });
    const payer = screen.getByLabelText('Pagador');
    expect(payer).toHaveValue('carlos');
    expect(payer).toBeDisabled();
  });

  it('requires a participant other than the payer when payment is MEMBER', () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Carlos/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto compartido' }));

    expect(screen.getByText(/distinta del pagador/i)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('warns when the space has only one member', () => {
    renderForm({ members: [members[0]!] });
    expect(screen.getByText(/Solo hay una persona/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar gasto compartido' })).toBeDisabled();
  });

  it('calls preview when amount and participants are valid', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '90' } });

    await waitFor(
      () => expect(previewMock).toHaveBeenCalled(),
      { timeout: 1_500 },
    );
    expect(previewMock.mock.calls.at(-1)?.[1].split).toEqual({
      mode: 'EQUAL',
      participantUserIds: ['ana', 'carlos'],
    });
  });

  it('sends PERCENTAGE split when selected', async () => {
    createMock.mockResolvedValueOnce({ id: 'exp-3' } as Awaited<
      ReturnType<typeof createSharedExpense>
    >);
    renderForm();
    fireEvent.change(screen.getByLabelText('Método de reparto'), { target: { value: 'PERCENTAGE' } });
    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto compartido' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0]?.[1].split).toEqual({
      mode: 'PERCENTAGE',
      shares: [
        { userId: 'ana', percent: '50.00' },
        { userId: 'carlos', percent: '50.00' },
      ],
    });
  });

  it('sends SPACE_ACCOUNT payment when selected', async () => {
    createMock.mockResolvedValueOnce({ id: 'exp-2' } as Awaited<
      ReturnType<typeof createSharedExpense>
    >);
    renderForm();

    fireEvent.change(screen.getByLabelText('Quién pagó'), {
      target: { value: 'SPACE_ACCOUNT' },
    });
    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto compartido' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0]?.[1].payment).toEqual({
      source: 'SPACE_ACCOUNT',
      accountId: 'acc-1',
    });
  });
});
