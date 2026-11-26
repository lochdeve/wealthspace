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

function isRailwayHost(hostname: string): boolean {
  return hostname.endsWith('.railway.app');
}

function getServerApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    try {
      const { hostname } = new URL(configured);
      if (!isRailwayHost(hostname)) {
        return normalizeBase(configured);
      }
    } catch {
      /* invalid NEXT_PUBLIC_API_URL */
    }
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    const withScheme = production.startsWith('http') ? production : `https://${production}`;
    return normalizeBase(withScheme);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  return normalizeBase(configured || DEFAULT_API_URL);
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

  return getServerApiBaseUrl();
}