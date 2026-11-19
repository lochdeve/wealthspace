import type { Account } from '@/lib/api/finance-types';
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