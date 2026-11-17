/** Default UI percents that sum to 100.00 with up to 2 decimal places (e.g. 33.33 / 33.33 / 33.34). */
export function defaultEqualPercents(participantCount: number): string[] {
  if (participantCount <= 0) {
    return [];
  }
  if (participantCount === 1) {
    return ['100.00'];
  }
  const basisTotal = 10_000;
  const per = Math.floor(basisTotal / participantCount);
  const leading = Array.from({ length: participantCount - 1 }, () => per);
  const last = basisTotal - per * (participantCount - 1);
  return [...leading, last].map((basis) => (basis / 100).toFixed(2));
}

export function percentsForUserIds(userIds: string[]): Record<string, string> {
  const values = defaultEqualPercents(userIds.length);
  return Object.fromEntries(userIds.map((userId, index) => [userId, values[index] ?? '']));
}