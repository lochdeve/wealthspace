const DEFAULT_API_URL = 'http://localhost:3001';

/** Public API base URL (no trailing slash). */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
  return raw.replace(/\/$/, '');
}
