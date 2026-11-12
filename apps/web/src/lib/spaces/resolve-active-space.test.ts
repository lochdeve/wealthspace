import { describe, expect, it, vi } from 'vitest';
import type { SpaceListItem } from '@/lib/api/space-types';
import { resolveActiveSpaceId } from '@/lib/spaces/resolve-active-space';

vi.mock('@/lib/spaces/active-space.server', () => ({
  getActiveSpaceId: vi.fn(),
}));

import { getActiveSpaceId } from '@/lib/spaces/active-space.server';

const sharedA: SpaceListItem = {
  id: 'shared-a',
  type: 'SHARED',
  name: 'A',
  displayCurrency: null,
  role: 'OWNER',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const personal: SpaceListItem = {
  id: 'personal-1',
  type: 'PERSONAL',
  name: 'Personal',
  displayCurrency: 'EUR',
  role: 'OWNER',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

describe('resolveActiveSpaceId', () => {
  it('returns null when user has no spaces', async () => {
    vi.mocked(getActiveSpaceId).mockResolvedValue(null);
    await expect(resolveActiveSpaceId([], personal.id)).resolves.toBeNull();
  });

  it('prefers stored cookie when still a member', async () => {
    vi.mocked(getActiveSpaceId).mockResolvedValue(sharedA.id);
    await expect(resolveActiveSpaceId([personal, sharedA], personal.id)).resolves.toBe(sharedA.id);
  });

  it('falls back to personal space when cookie points elsewhere', async () => {
    vi.mocked(getActiveSpaceId).mockResolvedValue('stale-space');
    await expect(resolveActiveSpaceId([personal, sharedA], personal.id)).resolves.toBe(personal.id);
  });

  it('uses first space when personal id is missing', async () => {
    vi.mocked(getActiveSpaceId).mockResolvedValue(null);
    await expect(resolveActiveSpaceId([sharedA], undefined)).resolves.toBe(sharedA.id);
  });
});
