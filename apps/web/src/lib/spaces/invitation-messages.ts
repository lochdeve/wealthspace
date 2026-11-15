import { userErrorMessage } from '@/lib/api/errors';

const INVITATION_ERROR_MESSAGES: Record<string, string> = {
  INVITATION_ALREADY_PENDING: 'Ya hay una invitación pendiente para ese correo.',
  INVITEE_ALREADY_MEMBER: 'Esa persona ya es miembro del espacio.',
  CANNOT_INVITE_SELF: 'No puedes enviarte una invitación a tu propio correo.',
  INSUFFICIENT_ROLE: 'No tienes permiso para gestionar las invitaciones de este espacio.',
  SPACE_NOT_SHARED: 'Solo se puede invitar a espacios compartidos.',
  SPACE_NOT_FOUND: 'No se encontró el espacio o ya no tienes acceso.',
  INVITATION_EXPIRED: 'La invitación ha caducado. Pide que te inviten de nuevo.',
  ALREADY_MEMBER: 'Ya eres miembro de este espacio.',
  INVITATION_NOT_FOUND: 'Esta invitación ya no está disponible: se ha revocado o ya se respondió.',
};

export function invitationActionErrorMessage(error: unknown, fallback: string): string {
  return userErrorMessage(error, INVITATION_ERROR_MESSAGES, fallback);
}
