const STORAGE_PREFIX = 'wealthspace:lastPersonalAccountId';

export function readLastPersonalAccountId(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}:${userId}`)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function writeLastPersonalAccountId(userId: string, accountId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, accountId);
  } catch {
    // Non-critical UX hint only.
  }
}
