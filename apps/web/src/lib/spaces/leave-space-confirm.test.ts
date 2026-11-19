import { describe, expect, it } from 'vitest';
import {
  appendLastActiveMemberLeaveNotice,
  isSoleActiveMember,
} from '@/lib/spaces/leave-space-confirm';

describe('leave-space-confirm', () => {
  it('flags sole active member', () => {
    expect(isSoleActiveMember(1)).toBe(true);
    expect(isSoleActiveMember(2)).toBe(false);
  });

  it('appends C-05 warning for sole active member', () => {
    const base = '¿Salir?';
    expect(appendLastActiveMemberLeaveNotice(base, 2)).toBe(base);
    expect(appendLastActiveMemberLeaveNotice(base, 1)).toContain('C-05');
    expect(appendLastActiveMemberLeaveNotice(base, 1)).toContain('única persona activa');
  });
});