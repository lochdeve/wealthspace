import { getPublicApiBaseUrl, getServerApiBaseUrl } from '@/lib/env';
import { AUTH_ERROR_CODES, parseErrorResponse } from '@/lib/api/errors';
import { redirectBrowserToLogin } from '@/lib/auth/login-redirect';

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
  /** Forward session cookie on the server (RSC / Server Actions). */
  cookieHeader?: string;
};

async function resolveApiBaseUrl(): Promise<string> {
  if (typeof window !== 'undefined') {
    return getPublicApiBaseUrl();
  }
  try {
    const { headers } = await import('next/headers');
    const headerStore = await headers();
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
    if (host) {
      const proto = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  } catch {
    /* no request context */
  }
  return getServerApiBaseUrl();
}

async function buildApiUrl(path: string): Promise<string> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = await resolveApiBaseUrl();
  return `${base}/api/v1${normalized}`;
}

function serializeBody(body: ApiRequestOptions['body']): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams)
  ) {
    return JSON.stringify(body);
  }
  return body as BodyInit;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { cookieHeader, body, headers: inputHeaders, ...init } = options;
  const headers = new Headers(inputHeaders);
  const serialized = serializeBody(body);
  if (serialized !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const response = await fetch(await buildApiUrl(path), {
    ...init,
    headers,
    body: serialized,
    credentials: cookieHeader ? 'omit' : 'include',
    cache: 'no-store',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const apiError = await parseErrorResponse(response);
    if (
      typeof window !== 'undefined' &&
      apiError.statusCode === 401 &&
      apiError.code === AUTH_ERROR_CODES.UNAUTHENTICATED
    ) {
      redirectBrowserToLogin();
    }
    throw apiError;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
