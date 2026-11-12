import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api/auth';
import { ApiError, AUTH_ERROR_CODES } from '@/lib/api/errors';
import type { UserProfile } from '@/lib/api/types';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export async function getSessionCookieHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    return null;
  }
  return `${session.name}=${session.value}`;
}

type GetCurrentUserOptions = {
  /**
   * When true, treat API 5xx/502/503 as "no session" so public auth pages still render
   * if the API or database is temporarily unavailable.
   */
  tolerateUnavailableApi?: boolean;
};

function isUnavailableApiError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode >= 500;
}

export async function getCurrentUser(
  options: GetCurrentUserOptions = {},
): Promise<UserProfile | null> {
  const cookieHeader = await getSessionCookieHeader();
  if (!cookieHeader) {
    return null;
  }
  try {
    return await getMe(cookieHeader);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return null;
    }
    if (options.tolerateUnavailableApi && isUnavailableApiError(error)) {
      return null;
    }
    throw error;
  }
}

export async function requireUser(nextPath?: string): Promise<UserProfile> {
  const user = await getCurrentUser({ tolerateUnavailableApi: true });
  if (!user) {
    const query =
      nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? `?next=${encodeURIComponent(nextPath)}`
        : '';
    redirect(`/login${query}`);
  }
  return user;
}

export async function redirectIfAuthenticated(destination = '/spaces'): Promise<void> {
  const user = await getCurrentUser({ tolerateUnavailableApi: true });
  if (user) {
    redirect(destination);
  }
}

export function isUnauthenticatedApiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.statusCode === 401 || error.code === AUTH_ERROR_CODES.UNAUTHENTICATED)
  );
}
