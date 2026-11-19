import { describe, expect, it } from 'vitest';
import type { Account } from '@/lib/api/finance-types';
import {
  activeAccountsMatchingCurrency,
  canLinkPersonalPaymentAsPayer,
  canRegisterSettlementPersonalCashFlow,
  settlementsNeedingCreditorPersonalLink,
  settlementActorSide,
  showPersonalPayerAccountPicker,
} from '@/lib/finance/personal-cash-link';
import type { Settlement } from '@/lib/api/settlement-types';

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
    const rows = activeAccountsMatchingCurrency([account('a', 'EUR'), account('b', 'USD')], 'EUR');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('a');
  });

  it('shows picker only for self as payer on create', () => {
    expect(showPersonalPayerAccountPicker('MEMBER', 'me', 'me', false)).toBe(true);
    expect(showPersonalPayerAccountPicker('MEMBER', 'other', 'me', false)).toBe(false);
    expect(showPersonalPayerAccountPicker('MEMBER', 'me', 'me', true)).toBe(false);
    expect(showPersonalPayerAccountPicker('SPACE_ACCOUNT', 'me', 'me', false)).toBe(false);
  });

  it('detects settlement actor side', () => {
    expect(settlementActorSide('debtor', 'creditor', 'debtor')).toBe('from');
    expect(settlementActorSide('debtor', 'creditor', 'creditor')).toBe('to');
    expect(canRegisterSettlementPersonalCashFlow('a', 'b', 'c')).toBe(false);
  });

  it('lists creditor settlements needing personal link', () => {
    const rows: Settlement[] = [
      {
        id: '1',
        fromUserId: 'carlos',
        toUserId: 'ana',
        amount: '10',
        currency: 'EUR',
        occurredAt: '',
        recordedByUserId: 'carlos',
        version: 1,
        myPersonalCashLink: { linked: false, canLink: true, side: 'to' },
      },
    ];
    expect(settlementsNeedingCreditorPersonalLink(rows, 'ana')).toHaveLength(1);
    expect(settlementsNeedingCreditorPersonalLink(rows, 'carlos')).toHaveLength(0);
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
