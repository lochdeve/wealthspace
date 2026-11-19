import { userErrorMessage } from '@/lib/api/errors';

const PROFILE_ERROR_MESSAGES: Record<string, string> = {
  NO_CHANGES: 'Indica al menos un campo para guardar.',
  INVALID_TIMEZONE: 'Zona horaria no válida. Usa un identificador IANA (p. ej. Europe/Madrid).',
};

export function profileActionErrorMessage(error: unknown): string {
  return userErrorMessage(error, PROFILE_ERROR_MESSAGES);
}
