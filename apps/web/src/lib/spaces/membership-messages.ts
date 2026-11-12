import { ApiError } from '@/lib/api/errors';

const MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  SPACE_NOT_SHARED: 'Solo puedes salir o gestionar miembros en espacios compartidos.',
  CANNOT_LEAVE_AS_SOLE_OWNER:
    'Eres el único propietario. Transfiere el rol o invita a otro propietario antes de salir.',
  USE_LEAVE_INSTEAD: 'Para abandonar el espacio usa «Salir del espacio», no expulsarte.',
  CANNOT_REMOVE_SOLE_OWNER: 'No puedes expulsar al único propietario del espacio.',
  MEMBER_NOT_FOUND: 'Ese miembro ya no está activo en el espacio.',
  INSUFFICIENT_ROLE: 'No tienes permiso para expulsar a este miembro.',
};

export function membershipActionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    const mapped = MEMBERSHIP_ERROR_MESSAGES[error.code];
    if (mapped) {
      return mapped;
    }
  }
  return error instanceof ApiError ? error.message : 'No se pudo completar la acción.';
}
