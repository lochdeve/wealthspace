const DEFAULT_API_URL = 'http://localhost:3001';

function normalizeBase(raw: string): string {
  return raw.replace(/\/$/, '');
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Public API base URL (no trailing slash). */
export function getPublicApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const pageOrigin = window.location.origin;
    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configured) {
      try {
        const confOrigin = new URL(configured).origin;
        if (confOrigin === pageOrigin) {
          return normalizeBase(configured);
        }
        if (isLocalDevOrigin(confOrigin) && isLocalDevOrigin(pageOrigin)) {
          return normalizeBase(configured);
        }
      } catch {
        /* invalid NEXT_PUBLIC_API_URL */
      }
    }
    // Vercel+Railway: bundle may still point at Railway; always use same-origin proxy.
    return pageOrigin;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
  return normalizeBase(raw);
}