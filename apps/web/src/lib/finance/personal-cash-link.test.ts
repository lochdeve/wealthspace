import { describe, expect, it } from 'vitest';
import type { Account } from '@/lib/api/finance-types';
import {
  activeAccountsMatchingCurrency,
  canLinkPersonalPaymentAsPayer,
  showPersonalPayerAccountPicker,
} from '@/lib/finance/personal-cash-link';

function account(id: string, currency: string, archived = false): Account {
  return {
    id,
    name: id,
    currency,
    balance: '0',
    createdAt: '',
    updatedAt: '',
    archivedAt: archived ? '2026-01-01' : undefined,
  };
}

describe('personal-cash-link', () => {
  it('filters personal accounts by currency', () => {
    const rows = activeAccountsMatchingCurrency(
      [account('a', 'EUR'), account('b', 'USD')],
      'EUR',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('a');
  });

  it('shows picker only for self as payer on create', () => {
    expect(showPersonalPayerAccountPicker('MEMBER', 'me', 'me', false)).toBe(true);
    expect(showPersonalPayerAccountPicker('MEMBER', 'other', 'me', false)).toBe(false);
    expect(showPersonalPayerAccountPicker('MEMBER', 'me', 'me', true)).toBe(false);
    expect(showPersonalPayerAccountPicker('SPACE_ACCOUNT', 'me', 'me', false)).toBe(false);
  });

  it('gates link CTA for payer with canLink', () => {
    expect(
      canLinkPersonalPaymentAsPayer('MEMBER', 'me', 'me', false, {
        linked: false,
        canLink: true,
      }),
    ).toBe(true);
    expect(
      canLinkPersonalPaymentAsPayer('MEMBER', 'me', 'me', false, {
        linked: true,
        canLink: false,
      }),
    ).toBe(false);
  });
});