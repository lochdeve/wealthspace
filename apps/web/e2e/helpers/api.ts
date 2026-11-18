const DEFAULT_API_URL = 'http://localhost:3001';
export const E2E_PASSWORD = 'E2eTestPass!1';

export function getE2EApiBaseUrl(): string {
  const raw =
    process.env.PLAYWRIGHT_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_API_URL;
  return raw.replace(/\/$/, '');
}

type ApiErrorPayload = { code?: string; message?: string };

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorPayload;
    return body.message ?? body.code ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function sessionCookieFromResponse(response: Response): string {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  const fallback = response.headers.get('set-cookie');
  const raw = setCookies.length > 0 ? setCookies : fallback ? [fallback] : [];
  const pairs = raw
    .map((chunk) => chunk.split(';')[0]?.trim())
    .filter((pair): pair is string => Boolean(pair?.includes('=')));
  return pairs.join('; ');
}

function mergeCookies(existing: string | undefined, response: Response): string {
  const incoming = sessionCookieFromResponse(response);
  if (!existing) {
    return incoming;
  }
  if (!incoming) {
    return existing;
  }
  return `${existing}; ${incoming}`;
}

async function apiJson<T>(
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<{ data: T; cookie: string }> {
  const { cookie, headers: inputHeaders, ...rest } = init;
  const headers = new Headers(inputHeaders);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (cookie) {
    headers.set('Cookie', cookie);
  }

  const response = await fetch(`${getE2EApiBaseUrl()}/api/v1${path}`, {
    ...rest,
    headers,
  });

  const nextCookie = mergeCookies(cookie, response);

  if (!response.ok) {
    const detail = await readApiError(response);
    throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status}: ${detail}`);
  }

  if (response.status === 204) {
    return { data: undefined as T, cookie: nextCookie };
  }

  const data = (await response.json()) as T;
  return { data, cookie: nextCookie };
}

const PHASE7_PROBE_SPACE_ID = '00000000-0000-4000-8000-000000000001';

export async function assertE2EApiReady(): Promise<void> {
  const base = getE2EApiBaseUrl();
  const response = await fetch(`${base}/api/v1/health`);
  if (!response.ok) {
    throw new Error(
      `API not reachable at ${base} (GET /api/v1/health → ${response.status})`,
    );
  }

  const balancesProbe = await fetch(
    `${base}/api/v1/spaces/${PHASE7_PROBE_SPACE_ID}/balances`,
  );
  if (balancesProbe.status === 404) {
    let detail = balancesProbe.statusText;
    try {
      const body = (await balancesProbe.json()) as { message?: string };
      detail = body.message ?? detail;
    } catch {
      /* ignore */
    }
    if (detail.includes('Cannot GET')) {
      throw new Error(
        `API at ${base} is missing GET /spaces/:spaceId/balances (phase 7). ` +
          'Restart `pnpm --filter @wealthspace/api dev` on current main.',
      );
    }
  }
}

type UserProfile = { id: string; email: string; displayName: string };

export type TwoMemberSharedSeed = {
  spaceId: string;
  owner: { id: string; email: string; password: string; displayName: string };
  member: { id: string; email: string; password: string; displayName: string };
};

export async function seedTwoMemberSharedSpace(): Promise<TwoMemberSharedSeed> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerEmail = `e2e-owner-${suffix}@wealthspace.test`;
  const memberEmail = `e2e-member-${suffix}@wealthspace.test`;
  const ownerName = 'E2E Owner';
  const memberName = 'E2E Member';

  const { data: owner } = await apiJson<UserProfile>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: ownerEmail,
      password: E2E_PASSWORD,
      displayName: ownerName,
      timezone: 'UTC',
    }),
  });

  const { data: member } = await apiJson<UserProfile>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: memberEmail,
      password: E2E_PASSWORD,
      displayName: memberName,
      timezone: 'UTC',
    }),
  });

  const { cookie: ownerCookie } = await apiJson<UserProfile>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ownerEmail, password: E2E_PASSWORD }),
  });

  const { data: space } = await apiJson<{ id: string }>('/spaces', {
    method: 'POST',
    cookie: ownerCookie,
    body: JSON.stringify({
      name: `E2E Shared ${suffix}`,
      displayCurrency: 'EUR',
    }),
  });

  await apiJson('/spaces/' + space.id + '/invitations', {
    method: 'POST',
    cookie: ownerCookie,
    body: JSON.stringify({ email: memberEmail, role: 'MEMBER' }),
  });

  const { cookie: memberCookie } = await apiJson<UserProfile>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: memberEmail, password: E2E_PASSWORD }),
  });

  const { data: invitations } = await apiJson<
    { id: string; spaceId: string; status: string }[]
  >('/invitations', {
    method: 'GET',
    cookie: memberCookie,
  });

  const invitation = invitations.find(
    (row) => row.spaceId === space.id && row.status === 'PENDING',
  );
  if (!invitation) {
    throw new Error('Expected pending invitation for E2E member');
  }

  await apiJson(`/invitations/${invitation.id}/accept`, {
    method: 'POST',
    cookie: memberCookie,
  });

  return {
    spaceId: space.id,
    owner: {
      id: owner.id,
      email: ownerEmail,
      password: E2E_PASSWORD,
      displayName: ownerName,
    },
    member: {
      id: member.id,
      email: memberEmail,
      password: E2E_PASSWORD,
      displayName: memberName,
    },
  };
}