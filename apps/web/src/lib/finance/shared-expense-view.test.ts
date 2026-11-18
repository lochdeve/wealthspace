import type { GeneratedDebt } from '@/lib/api/shared-expense-types';
import { findParticipantShare, viewerDebtLines } from './shared-expense-view';

const debts: GeneratedDebt[] = [
  { fromUserId: 'carlos', toUserId: 'ana', amount: '40.0000' },
  { fromUserId: 'bob', toUserId: 'carlos', amount: '10.0000' },
];

describe('findParticipantShare', () => {
  it('returns the viewer allocation when present', () => {
    const share = findParticipantShare('ana', [
      { userId: 'ana', displayName: 'Ana', allocatedAmount: '40.0000' },
    ]);
    expect(share?.allocatedAmount).toBe('40.0000');
  });
});

describe('viewerDebtLines', () => {
  const name = (id: string) => (id === 'ana' ? 'Ana' : id);

  it('lists what the viewer owes and is owed', () => {
    const lines = viewerDebtLines('carlos', 'EUR', debts, name);
    expect(lines[0]).toMatch(/Debes.*40.*Ana/);
    expect(lines[1]).toMatch(/bob te debe.*10/);
  });

  it('lists what the viewer is owed', () => {
    expect(viewerDebtLines('ana', 'EUR', debts, name)[0]).toMatch(/carlos te debe.*40/);
  });
});