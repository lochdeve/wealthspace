import { ApiError } from '@/lib/api/errors';

const FINANCE_ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_FOUND: 'No se encontró la cuenta en este espacio.',
  ACCOUNT_ALREADY_ARCHIVED: 'La cuenta ya está archivada.',
  ACCOUNT_ARCHIVED: 'No puedes registrar movimientos en una cuenta archivada.',
  OPENING_BALANCE_EXISTS: 'Esta cuenta ya tiene saldo inicial.',
  INVALID_AMOUNT: 'Importe no válido. Usa hasta 4 decimales.',
  ACCOUNT_REQUIRED: 'Selecciona una cuenta.',
  CATEGORY_NOT_FOUND: 'La categoría no existe en este espacio.',
  INVALID_CATEGORY_TYPE: 'La categoría no coincide con ingreso o gasto.',
  CURRENCY_MISMATCH: 'Las cuentas deben usar la misma moneda.',
  SAME_ACCOUNT_TRANSFER: 'Elige una cuenta de destino distinta.',
  VERSION_CONFLICT: 'Alguien modificó este movimiento. Recarga e inténtalo de nuevo.',
  TRANSACTION_NOT_FOUND: 'Movimiento no encontrado.',
  TRANSACTION_LINKED_TO_SHARED_EXPENSE:
    'No se puede editar un pago vinculado a un gasto compartido.',
  NO_CHANGES: 'Indica al menos un campo para actualizar.',
  ATTRIBUTION_REQUIRED: 'Indica a quién se atribuye el gasto.',
  ATTRIBUTION_NOT_ALLOWED: 'No puedes atribuir el gasto a esa persona.',
  ATTRIBUTEE_NOT_ACTIVE_MEMBER: 'Esa persona ya no está activa en el espacio.',
  CURRENCY_REQUIRED: 'Indica la moneda si no usas cuenta o falta moneda del espacio.',
};

export function financeActionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    const mapped = FINANCE_ERROR_MESSAGES[error.code];
    if (mapped) {
      return mapped;
    }
  }
  return error instanceof ApiError ? error.message : 'No se pudo completar la acción.';
}
