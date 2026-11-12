'use server';

import { cookies } from 'next/headers';
import { ACTIVE_SPACE_COOKIE_NAME } from '@/lib/spaces/constants';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getActiveSpaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_SPACE_COOKIE_NAME)?.value;
  return value?.length ? value : null;
}

export async function setActiveSpaceId(spaceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_SPACE_COOKIE_NAME, spaceId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function clearActiveSpaceId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_SPACE_COOKIE_NAME);
}
