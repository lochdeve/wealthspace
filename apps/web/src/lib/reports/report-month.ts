/** Local calendar year/month for a given IANA timezone (B-10). */
export function currentYearMonthInTimezone(timezone: string): { year: number; month: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
    );
    return {
      year: Number(parts.year),
      month: Number(parts.month),
    };
  } catch {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
}

export function parseReportMonthQuery(
  yearRaw: string | undefined,
  monthRaw: string | undefined,
  fallback: { year: number; month: number },
): { year: number; month: number } {
  const year = yearRaw !== undefined ? Number.parseInt(yearRaw, 10) : fallback.year;
  const month = monthRaw !== undefined ? Number.parseInt(monthRaw, 10) : fallback.month;
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return fallback;
  }
  return { year, month };
}

export function monthLabel(year: number, month: number, locale = 'es-ES'): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}