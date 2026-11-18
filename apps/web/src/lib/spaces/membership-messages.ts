import { userErrorMessage } from '@/lib/api/errors';

const MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  SPACE_NOT_SHARED: 'Solo puedes salir o gestionar miembros en espacios compartidos.',
  CANNOT_LEAVE_AS_SOLE_OWNER:
    'Eres el único propietario. Transfiere el ownership a otra persona antes de salir.',
  TRANSFER_TO_SELF: 'No puedes transferirte el ownership a ti mismo.',
  TRANSFER_TARGET_NOT_ELIGIBLE:
    'Solo puedes transferir el ownership a un administrador o miembro activo.',
  TRANSFER_FORBIDDEN: 'Solo el propietario puede transferir el ownership.',
  USE_LEAVE_INSTEAD: 'Para abandonar el espacio usa «Salir del espacio», no expulsarte.',
  CANNOT_REMOVE_SOLE_OWNER: 'No puedes expulsar al único propietario del espacio.',
  MEMBER_NOT_FOUND: 'Ese miembro ya no está activo en el espacio.',
  INSUFFICIENT_ROLE: 'No tienes permiso para esta acción.',
  SPACE_NOT_FOUND: 'No se encontró el espacio o ya no tienes acceso.',
};

export function membershipActionErrorMessage(error: unknown): string {
  return userErrorMessage(error, MEMBERSHIP_ERROR_MESSAGES);
}
