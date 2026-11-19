import { render, screen } from '@testing-library/react';
import type { SharedExpenseDetail } from '@/lib/api/shared-expense-types';
import { SharedExpenseDetailPanel } from './shared-expense-detail-panel';

const expense: SharedExpenseDetail = {
  id: 'exp-1',
  description: 'Cena',
  totalAmount: '90.0000',
  currency: 'EUR',
  occurredAt: '2026-01-15T20:00:00.000Z',
  splitMode: 'EQUAL',
  payment: { source: 'MEMBER', paidByUserId: 'ana' },
  participants: [
    { userId: 'ana', displayName: 'Ana', allocatedAmount: '45.0000' },
    { userId: 'carlos', displayName: 'Carlos', allocatedAmount: '45.0000' },
  ],
  generatedDebts: [{ fromUserId: 'carlos', toUserId: 'ana', amount: '45.0000' }],
  recordedByUserId: 'ana',
  voidedAt: null,
  version: 1,
};

const members = [
  {
    userId: 'ana',
    displayName: 'Ana',
    email: 'a@test.dev',
    role: 'OWNER' as const,
    joinedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    userId: 'carlos',
    displayName: 'Carlos',
    email: 'c@test.dev',
    role: 'MEMBER' as const,
    joinedAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('SharedExpenseDetailPanel', () => {
  it('shows your share and debt summary', () => {
    render(
      <SharedExpenseDetailPanel
        expense={expense}
        viewerUserId="carlos"
        members={members}
        accounts={[]}
      />,
    );
    expect(screen.getByText(/Tu parte/i)).toBeInTheDocument();
    expect(screen.getByText(/Debes.*45.*Ana/)).toBeInTheDocument();
  });

  it('hints when payer can link personal payment later', () => {
    render(
      <SharedExpenseDetailPanel
        expense={{
          ...expense,
          myPersonalCashLink: { linked: false, canLink: true },
        }}
        viewerUserId="ana"
        members={members}
        accounts={[]}
      />,
    );
    expect(screen.getByText(/Aún no has vinculado este pago/i)).toBeInTheDocument();
  });

  it('shows voided banner', () => {
    render(
      <SharedExpenseDetailPanel
        expense={{ ...expense, voidedAt: '2026-02-01T10:00:00.000Z' }}
        viewerUserId="carlos"
        members={members}
        accounts={[]}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Las deudas que generó ya no cuentan/i);
    expect(screen.queryByText(/Resumen para ti/i)).not.toBeInTheDocument();
  });
});
