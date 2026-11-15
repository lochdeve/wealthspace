export type ApiErrorPayload = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;
  readonly payload: ApiErrorPayload;

  constructor(statusCode: number, payload: ApiErrorPayload) {
    const message = formatApiMessage(payload.message) ?? `HTTP ${statusCode}`;
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = payload.code;
    this.payload = payload;
  }
}

export function formatApiMessage(message: ApiErrorPayload['message']): string | undefined {
  if (message === undefined) {
    return undefined;
  }
  if (Array.isArray(message)) {
    return message.join(' ');
  }
  return message;
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'statusCode' in value || 'message' in value || 'code' in value;
}

export async function parseErrorResponse(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = { statusCode: response.status };
  try {
    const body: unknown = await response.json();
    if (isApiErrorPayload(body)) {
      payload = { ...payload, ...body };
    }
  } catch {
    payload.message = response.statusText || undefined;
  }
  return new ApiError(response.status, payload);
}

export const GENERIC_ERROR_MESSAGE = 'No se pudo completar la acción. Inténtalo de nuevo.';
export const SERVICE_UNAVAILABLE_MESSAGE =
  'El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
export const INVALID_INPUT_MESSAGE = 'Revisa los datos introducidos.';

/**
 * User-facing copy for an API failure, resolved by stable `code`.
 * Never returns the API `message`, which is English and not meant for end users.
 */
export function userErrorMessage(
  error: unknown,
  messagesByCode: Readonly<Record<string, string>>,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  const mapped = error.code ? messagesByCode[error.code] : undefined;
  if (mapped) {
    return mapped;
  }
  if (error.statusCode >= 500) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }
  if (error.statusCode === 401) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (error.statusCode === 400) {
    return INVALID_INPUT_MESSAGE;
  }
  return fallback;
}

/** Stable codes returned by auth endpoints (for UX branching). */
export const AUTH_ERROR_CODES = {
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
} as const;
