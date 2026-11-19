import type { Account } from '@/lib/api/finance-types';
import type { Settlement } from '@/lib/api/settlement-types';
import type { PaymentSource } from '@/lib/api/shared-expense-types';

export function activeAccountsMatchingCurrency(accounts: Account[], currency: string): Account[] {
  const code = currency.trim().toUpperCase();
  return accounts.filter(
    (row) => !row.archivedAt && row.currency.trim().toUpperCase() === code,
  );
}

/** P-02: optional personal account only when the actor is the member payer on create. */
export function showPersonalPayerAccountPicker(
  paymentSource: PaymentSource,
  paidByUserId: string,
  currentUserId: string,
  isEdit: boolean,
): boolean {
  return !isEdit && paymentSource === 'MEMBER' && paidByUserId === currentUserId;
}

export function canLinkPersonalPaymentAsPayer(
  paymentSource: PaymentSource,
  paidByUserId: string,
  viewerUserId: string,
  voided: boolean,
  link?: { linked: boolean; canLink: boolean },
): boolean {
  if (voided || paymentSource !== 'MEMBER' || paidByUserId !== viewerUserId) {
    return false;
  }
  return Boolean(link?.canLink && !link.linked);
}

export function settlementActorSide(
  fromUserId: string,
  toUserId: string,
  currentUserId: string,
): 'from' | 'to' | null {
  if (fromUserId === currentUserId) {
    return 'from';
  }
  if (toUserId === currentUserId) {
    return 'to';
  }
  return null;
}

export function canRegisterSettlementPersonalCashFlow(
  fromUserId: string,
  toUserId: string,
  currentUserId: string,
): boolean {
  return settlementActorSide(fromUserId, toUserId, currentUserId) !== null;
}

export function settlementPersonalCashFlowHint(
  side: 'from' | 'to',
): string {
  return side === 'from'
    ? 'Salida en tu cuenta personal por este importe.'
    : 'Entrada en tu cuenta personal por este importe.';
}

export function settlementNeedsPersonalCashLink(
  row: Settlement,
  viewerUserId: string,
): boolean {
  if (row.voidedAt) {
    return false;
  }
  const link = row.myPersonalCashLink;
  if (!link?.canLink || link.linked) {
    return false;
  }
  return row.fromUserId === viewerUserId || row.toUserId === viewerUserId;
}

/** P-07: acreedor (`to`) puede anotar el cobro tras registro ajeno. */
export function settlementsNeedingCreditorPersonalLink(
  settlements: Settlement[],
  viewerUserId: string,
): Settlement[] {
  return settlements.filter(
    (row) =>
      !row.voidedAt &&
      row.toUserId === viewerUserId &&
      row.myPersonalCashLink?.canLink &&
      !row.myPersonalCashLink.linked,
  );
}