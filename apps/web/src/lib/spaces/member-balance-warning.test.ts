import { describe, expect, it } from 'vitest';
import type { SpaceBalances } from '@/lib/api/balance-types';
import {
  appendNonZeroNetBalanceNotice,
  userHasNonZeroNet,
} from '@/lib/spaces/member-balance-warning';

const userId = 'user-bob';

function balances(net: string): SpaceBalances {
  return {
    currencies: [
      {
        currency: 'EUR',
        debts: [],
        members: [{ userId, net }],
      },
    ],
  };
}

describe('member-balance-warning', () => {
  it('detects non-zero net', () => {
    expect(userHasNonZeroNet(balances('-40'), userId)).toBe(true);
    expect(userHasNonZeroNet(balances('0'), userId)).toBe(false);
    expect(userHasNonZeroNet(balances('0.0000'), userId)).toBe(false);
  });

  it('appends informative notice for leave', () => {
    const message = appendNonZeroNetBalanceNotice(
      '¿Salir?',
      balances('-40'),
      userId,
      'second',
    );
    expect(message).toContain('¿Salir?');
    expect(message).toContain('Tienes saldo pendiente');
    expect(message).toContain('EUR:');
    expect(message).toContain('saldar después');
  });

  it('leaves message unchanged when net is zero', () => {
    const base = '¿Salir?';
    expect(appendNonZeroNetBalanceNotice(base, balances('0'), userId, 'second')).toBe(base);
  });
});