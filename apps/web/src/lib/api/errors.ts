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

/** Stable codes returned by auth endpoints (for UX branching). */
export const AUTH_ERROR_CODES = {
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
} as const;
