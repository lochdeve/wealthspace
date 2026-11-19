import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Account } from '@/lib/api/finance-types';
import { createSharedExpense, previewSharedExpense, updateSharedExpense } from '@/lib/api/shared-expenses';
import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import { CreateSharedExpenseForm } from './create-shared-expense-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/lib/api/shared-expenses', () => ({
  createSharedExpense: vi.fn(),
  previewSharedExpense: vi.fn(),
  updateSharedExpense: vi.fn(),
}));

const createMock = vi.mocked(createSharedExpense);
const previewMock = vi.mocked(previewSharedExpense);
const updateMock = vi.mocked(updateSharedExpense);

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
      personalAccounts={[account('personal-1')]}
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

  it('updates an existing expense when edit props are provided', async () => {
    updateMock.mockResolvedValueOnce({ id: 'exp-edit' } as Awaited<ReturnType<typeof updateSharedExpense>>);
    const expense = {
      id: 'exp-edit',
      description: 'Cena',
      totalAmount: '80.0000',
      currency: 'EUR',
      occurredAt: '2026-05-01T18:00:00.000Z',
      splitMode: 'EQUAL' as const,
      payment: { source: 'MEMBER' as const, paidByUserId: 'ana' },
      participants: [
        { userId: 'ana', displayName: 'Ana', allocatedAmount: '40.0000' },
        { userId: 'carlos', displayName: 'Carlos', allocatedAmount: '40.0000' },
      ],
      generatedDebts: [],
      recordedByUserId: 'ana',
      version: 3,
    } satisfies SharedExpenseDetail;

    renderForm({ edit: { expenseId: 'exp-edit', expense } });
    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateMock.mock.calls[0]?.[2].expectedVersion).toBe(3);
    expect(updateMock.mock.calls[0]?.[2].totalAmount).toBe('90');
    expect(push).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it('includes personalAccountId when payer selects a personal account', async () => {
    createMock.mockResolvedValueOnce({ id: 'exp-p' } as Awaited<
      ReturnType<typeof createSharedExpense>
    >);
    renderForm({ personalAccounts: [account('personal-1')] });

    fireEvent.change(screen.getByLabelText('Importe total'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Pagado desde mi cuenta (opcional)'), {
      target: { value: 'personal-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto compartido' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0]?.[1].payment).toEqual({
      source: 'MEMBER',
      paidByUserId: 'ana',
      personalAccountId: 'personal-1',
    });
  });

  it('hides personal account selector when payer is not the current user', () => {
    renderForm({ currentUserId: 'ana', actorRole: 'OWNER' });
    fireEvent.change(screen.getByLabelText('Pagador'), { target: { value: 'carlos' } });
    expect(screen.queryByLabelText('Pagado desde mi cuenta (opcional)')).not.toBeInTheDocument();
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
