import type { NextConfig } from 'next';

function getApiProxyTarget(): string | undefined {
  const raw = process.env.API_PROXY_TARGET?.trim();
  if (!raw) {
    return undefined;
  }
  return raw.replace(/\/$/, '');
}

/** Proxy Railway: rewrites at build (Vercel) + `app/api/v1/[...path]/route.ts` at runtime. */
const nextConfig: NextConfig = {
  async rewrites() {
    const target = getApiProxyTarget();
    if (!target) {
      return [];
    }
    return [
      {
        source: '/api/v1/:path*',
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
