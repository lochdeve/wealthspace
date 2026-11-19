import type { SpaceMember } from '@/lib/api/space-types';
import { listOwnershipTransferTargets } from './ownership';

const members: SpaceMember[] = [
  {
    userId: 'owner',
    displayName: 'Ana',
    email: 'a@test.dev',
    role: 'OWNER',
    joinedAt: '',
  },
  {
    userId: 'admin',
    displayName: 'Carlos',
    email: 'c@test.dev',
    role: 'ADMIN',
    joinedAt: '',
  },
  {
    userId: 'mem',
    displayName: 'Bob',
    email: 'b@test.dev',
    role: 'MEMBER',
    joinedAt: '',
  },
];

describe('listOwnershipTransferTargets', () => {
  it('lists admins and members except the owner', () => {
    const targets = listOwnershipTransferTargets(members, 'owner');
    expect(targets.map((row) => row.userId)).toEqual(['admin', 'mem']);
  });
});
