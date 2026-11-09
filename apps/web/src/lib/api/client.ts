import { getPublicApiBaseUrl } from '@/lib/env';
import { parseErrorResponse } from '@/lib/api/errors';

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
  /** Forward session cookie on the server (RSC / Server Actions). */
  cookieHeader?: string;
};

function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicApiBaseUrl()}/api/v1${normalized}`;
}

function serializeBody(body: ApiRequestOptions['body']): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
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

  const response = await fetch(buildApiUrl(path), {
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
    throw await parseErrorResponse(response);
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
