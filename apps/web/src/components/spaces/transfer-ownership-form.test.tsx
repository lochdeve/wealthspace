import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SpaceMember } from '@/lib/api/space-types';
import { ApiError } from '@/lib/api/errors';
import { transferOwnership } from '@/lib/api/memberships';
import { TransferOwnershipForm } from './transfer-ownership-form';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/lib/api/memberships', () => ({
  transferOwnership: vi.fn(),
}));

const transferMock = vi.mocked(transferOwnership);

const members: SpaceMember[] = [
  {
    userId: 'owner',
    displayName: 'Ana',
    email: 'a@test.dev',
    role: 'OWNER',
    joinedAt: '',
  },
  {
    userId: 'carlos',
    displayName: 'Carlos',
    email: 'c@test.dev',
    role: 'MEMBER',
    joinedAt: '',
  },
];

describe('TransferOwnershipForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits transfer to selected member', async () => {
    transferMock.mockResolvedValueOnce(undefined);
    render(
      <TransferOwnershipForm
        spaceId="space-1"
        spaceName="Casa"
        currentUserId="owner"
        members={members}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Nueva propietaria/i), {
      target: { value: 'carlos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir ownership' }));
    await waitFor(() => expect(transferMock).toHaveBeenCalledWith('space-1', 'carlos'));
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/transferido/i);
  });

  it('shows API message for ineligible target', async () => {
    transferMock.mockRejectedValueOnce(
      new ApiError(409, { code: 'TRANSFER_TARGET_NOT_ELIGIBLE', message: 'raw' }),
    );
    render(
      <TransferOwnershipForm
        spaceId="space-1"
        spaceName="Casa"
        currentUserId="owner"
        members={members}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Nueva propietaria/i), {
      target: { value: 'carlos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir ownership' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/administrador o miembro/i));
  });
});