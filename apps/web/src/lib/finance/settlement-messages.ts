import { userErrorMessage } from '@/lib/api/errors';

const SETTLEMENT_ERROR_MESSAGES: Record<string, string> = {
  SHARED_SPACE_REQUIRED: 'Las liquidaciones solo existen en espacios compartidos.',
  SETTLEMENT_SAME_USER: 'El deudor y el acreedor deben ser personas distintas.',
  SETTLEMENT_USER_NOT_MEMBER:
    'Esa persona no tiene historial de gastos o liquidaciones en este espacio en esa moneda.',
  SETTLEMENT_NOT_FOUND: 'Liquidación no encontrada.',
  SETTLEMENT_FORBIDDEN: 'No tienes permiso para registrar o anular esta liquidación.',
  VERSION_CONFLICT: 'Alguien modificó esta liquidación. Recarga e inténtalo de nuevo.',
  ALREADY_VOIDED: 'Esta liquidación ya está anulada.',
  AMOUNT_PRECISION_INVALID: 'El importe tiene más decimales de los que admite la moneda.',
  CURRENCY_NOT_SUPPORTED: 'Moneda no válida.',
  PERSONAL_LINK_NOT_ALLOWED: 'No puedes vincular tu cuenta en esta liquidación.',
  PERSONAL_LINK_ALREADY_EXISTS: 'Tu lado de esta liquidación ya está vinculado.',
  PERSONAL_ACCOUNT_NOT_OWNED: 'La cuenta no pertenece a tu espacio personal.',
  CROSS_SPACE_CURRENCY_MISMATCH: 'La moneda de la cuenta debe coincidir con la de la liquidación.',
  ACCOUNT_NOT_FOUND: 'No se encontró la cuenta.',
  ACCOUNT_ARCHIVED: 'No puedes usar una cuenta archivada.',
};

const SETTLEMENT_WARNING_MESSAGES: Record<string, string> = {
  SETTLEMENT_EXCEEDS_PENDING_DEBT:
    'El importe supera la deuda pendiente entre estas dos personas. Se ha registrado igualmente.',
};

export function settlementActionErrorMessage(error: unknown): string {
  return userErrorMessage(error, SETTLEMENT_ERROR_MESSAGES);
}

export function settlementWarningMessage(code: string): string {
  return SETTLEMENT_WARNING_MESSAGES[code] ?? 'Aviso del servidor sobre esta liquidación.';
}
