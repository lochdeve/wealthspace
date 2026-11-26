import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function getProxyTarget(): string | null {
  const raw = process.env.API_PROXY_TARGET?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, '');
}

function buildUpstreamUrl(pathSegments: string[], search: string): string | null {
  const target = getProxyTarget();
  if (!target) {
    return null;
  }
  const pathname = pathSegments.map(encodeURIComponent).join('/');
  return `${target}/api/v1/${pathname}${search}`;
}

function forwardRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'host' || lower === 'content-length') {
      return;
    }
    headers.set(key, value);
  });
  return headers;
}

function applyUpstreamHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      headers.append('set-cookie', cookie);
    }
  }
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'set-cookie') {
      return;
    }
    headers.append(key, value);
  });
  return headers;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search);
  if (!upstreamUrl) {
    return NextResponse.json(
      { code: 'API_PROXY_NOT_CONFIGURED', message: 'API_PROXY_TARGET is not set on the web host.' },
      { status: 502 },
    );
  }

  const method = request.method;
  const headers = forwardRequestHeaders(request);
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body: hasBody ? body : undefined,
    redirect: 'manual',
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: applyUpstreamHeaders(upstream),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  return proxyRequest(request, context);
}