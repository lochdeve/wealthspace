import { canPickAttributionFor } from '@/lib/finance/attribution';

describe('canPickAttributionFor', () => {
  it('restricts members to themselves', () => {
    expect(canPickAttributionFor('MEMBER', 'me', 'me')).toBe(true);
    expect(canPickAttributionFor('MEMBER', 'me', 'other')).toBe(false);
  });

  it('allows owners to pick any target in the UI', () => {
    expect(canPickAttributionFor('OWNER', 'me', 'other')).toBe(true);
  });
});
