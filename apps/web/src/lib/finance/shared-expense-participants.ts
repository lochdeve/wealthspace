import type { PaymentSource } from '@/lib/api/shared-expense-types';

/** Client-side check aligned with P-15 (MEMBER payer needs another participant). */
export function sharedExpenseParticipantError(
  paymentSource: PaymentSource,
  paidByUserId: string,
  participantIds: string[],
  activeMemberCount: number,
): string | undefined {
  if (participantIds.length === 0) {
    return 'Elige al menos un participante.';
  }
  if (activeMemberCount < 2) {
    return 'Un gasto compartido requiere al menos dos personas en el espacio. Usa Gasto individual o invita a alguien.';
  }
  if (
    paymentSource === 'MEMBER' &&
    paidByUserId &&
    !participantIds.some((id) => id !== paidByUserId)
  ) {
    return 'Marca a al menos una persona distinta del pagador. Si pagas tú, indica quién más participó (no hace falta marcarte a ti).';
  }
  return undefined;
}

export function hasDistinctParticipantFromPayer(
  paidByUserId: string,
  participantIds: string[],
): boolean {
  return participantIds.some((id) => id !== paidByUserId);
}