import { ApiError, AUTH_ERROR_CODES } from '@/lib/api/errors';
import {
  buildLoginHref,
  isSessionUnauthorizedApiError,
  redirectBrowserToLogin,
} from './login-redirect';

describe('isSessionUnauthorizedApiError', () => {
  it('matches UNAUTHENTICATED', () => {
    const error = new ApiError(401, { code: AUTH_ERROR_CODES.UNAUTHENTICATED });
    expect(isSessionUnauthorizedApiError(error)).toBe(true);
  });

  it('rejects INVALID_CREDENTIALS', () => {
    const error = new ApiError(401, { code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });
    expect(isSessionUnauthorizedApiError(error)).toBe(false);
  });
});

describe('buildLoginHref', () => {
  it('encodes a safe return path', () => {
    expect(buildLoginHref('/spaces/abc')).toBe('/login?next=%2Fspaces%2Fabc');
  });

  it('rejects unsafe paths', () => {
    expect(buildLoginHref('//evil.test')).toBe('/login');
  });
});

describe('redirectBrowserToLogin', () => {
  it('assigns login with current path', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/spaces/x', search: '?tab=1', assign },
    });
    redirectBrowserToLogin();
    expect(assign).toHaveBeenCalledWith('/login?next=%2Fspaces%2Fx%3Ftab%3D1');
    vi.unstubAllGlobals();
  });
});
