import { userErrorMessage } from '@/lib/api/errors';

const SHARED_EXPENSE_ERROR_MESSAGES: Record<string, string> = {
  SHARED_SPACE_REQUIRED: 'Los gastos compartidos solo existen en espacios compartidos.',
  PAYER_NOT_ALLOWED: 'No puedes indicar que otra persona pagó este gasto.',
  PAYER_NOT_MEMBER: 'El pagador no era miembro activo del espacio en esa fecha.',
  PARTICIPANT_NOT_MEMBER: 'Algún participante no era miembro activo del espacio en esa fecha.',
  INSUFFICIENT_PARTICIPANTS:
    'Marca a al menos una persona distinta del pagador (o invita a otra persona al espacio).',
  DUPLICATE_PARTICIPANT: 'No repitas participantes.',
  SPLIT_PERCENT_SUM_INVALID: 'Los porcentajes deben sumar exactamente 100 %.',
  SPLIT_AMOUNT_SUM_INVALID: 'Los importes deben sumar el total del gasto.',
  SPLIT_SHARE_ZERO:
    'El reparto deja a alguien con parte 0. Cambia el importe, los participantes o el método.',
  AMOUNT_PRECISION_INVALID: 'El importe tiene más decimales de los que admite la moneda.',
  CURRENCY_NOT_SUPPORTED: 'Moneda no válida.',
  CATEGORY_NOT_FOUND: 'La categoría no existe en este espacio.',
  INVALID_CATEGORY_TYPE: 'La categoría no coincide con un gasto.',
  ACCOUNT_NOT_FOUND: 'No se encontró la cuenta en este espacio.',
  ACCOUNT_ARCHIVED: 'No puedes usar una cuenta archivada.',
  CURRENCY_REQUIRED: 'Indica la moneda si el espacio no tiene moneda por defecto.',
  SHARED_EXPENSE_NOT_FOUND: 'Gasto compartido no encontrado.',
  SHARED_EXPENSE_EDIT_FORBIDDEN: 'No tienes permiso para modificar este gasto.',
  ALREADY_VOIDED: 'Este gasto ya está anulado.',
  PAYMENT_SOURCE_IMMUTABLE: 'No se puede cambiar quién o qué pagó el gasto al editar.',
  VERSION_CONFLICT: 'Alguien modificó este gasto. Recarga e inténtalo de nuevo.',
};

export function sharedExpenseActionErrorMessage(error: unknown): string {
  return userErrorMessage(error, SHARED_EXPENSE_ERROR_MESSAGES);
}
