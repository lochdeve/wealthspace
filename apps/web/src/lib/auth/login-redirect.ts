import { ApiError, AUTH_ERROR_CODES } from '@/lib/api/errors';

/** API 401 that means “session missing or expired”, not wrong password on /login. */
export function isSessionUnauthorizedApiError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) {
    return false;
  }
  return (
    error.statusCode === 401 &&
    (error.code === AUTH_ERROR_CODES.UNAUTHENTICATED || error.code === undefined)
  );
}

export function buildLoginHref(nextPath?: string): string {
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }
  return '/login';
}

/** Client-only: full navigation so cookies and RSC cache reset cleanly. */
export function redirectBrowserToLogin(nextPath?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const next = nextPath ?? `${window.location.pathname}${window.location.search}`;
  window.location.assign(buildLoginHref(next));
}
