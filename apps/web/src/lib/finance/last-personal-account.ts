import type { Account } from '@/lib/api/finance-types';

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

/** Pick a valid personal account for selects (remembered id, else first option). */
export function resolvePersonalAccountSelection(
  currentUserId: string,
  options: Account[],
  selectedId: string,
): string {
  const trimmed = selectedId.trim();
  if (trimmed && options.some((row) => row.id === trimmed)) {
    return trimmed;
  }
  const remembered = readLastPersonalAccountId(currentUserId);
  if (remembered && options.some((row) => row.id === remembered)) {
    return remembered;
  }
  return options[0]?.id ?? '';
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
