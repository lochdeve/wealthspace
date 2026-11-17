import { canRegisterSettlement, canVoidSettlement } from './settlement-permissions';

describe('canRegisterSettlement', () => {
  it('allows parties and admins', () => {
    expect(canRegisterSettlement('OWNER', 'x', 'a', 'b')).toBe(true);
    expect(canRegisterSettlement('MEMBER', 'a', 'a', 'b')).toBe(true);
    expect(canRegisterSettlement('MEMBER', 'b', 'a', 'b')).toBe(true);
    expect(canRegisterSettlement('MEMBER', 'c', 'a', 'b')).toBe(false);
  });
});

describe('canVoidSettlement', () => {
  const settlement = { recordedByUserId: 'rec', fromUserId: 'a', toUserId: 'b' };

  it('allows recorder, parties, and admins', () => {
    expect(canVoidSettlement('ADMIN', 'x', settlement)).toBe(true);
    expect(canVoidSettlement('MEMBER', 'rec', settlement)).toBe(true);
    expect(canVoidSettlement('MEMBER', 'a', settlement)).toBe(true);
    expect(canVoidSettlement('MEMBER', 'c', settlement)).toBe(false);
  });
});