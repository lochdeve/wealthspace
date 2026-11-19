import { userErrorMessage } from '@/lib/api/errors';

const CONTRIBUTION_ERROR_MESSAGES: Record<string, string> = {
  SHARED_SPACE_REQUIRED: 'Las aportaciones solo existen en espacios compartidos.',
  CROSS_SPACE_CURRENCY_MISMATCH: 'La moneda debe coincidir con la cuenta del espacio.',
  PERSONAL_ACCOUNT_NOT_OWNED: 'La cuenta no pertenece a tu espacio personal.',
  PARTICIPANT_NOT_MEMBER: 'No eras miembro activo del espacio en esa fecha.',
  ACCOUNT_NOT_FOUND: 'No se encontró la cuenta.',
  ACCOUNT_ARCHIVED: 'No puedes usar una cuenta archivada.',
  AMOUNT_PRECISION_INVALID: 'El importe tiene más decimales de los que admite la moneda.',
};

export function contributionActionErrorMessage(error: unknown): string {
  return userErrorMessage(error, CONTRIBUTION_ERROR_MESSAGES, 'No se pudo registrar la aportación.');
}