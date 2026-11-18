import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import { isSessionUnauthorizedApiError } from '@/lib/auth/login-redirect';

/**
 * Maps space-scoped API failures to Next navigations (404 / login).
 * Re-throws everything else for the route error boundary.
 */
export function rethrowUnlessSpaceFound(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) {
      notFound();
    }
    if (isSessionUnauthorizedApiError(error)) {
      redirect('/login');
    }
  }
  throw error;
}