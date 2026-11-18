import { BadRequestException } from '@nestjs/common';

const INVALID_TIMEZONE = {
  statusCode: 400,
  code: 'INVALID_TIMEZONE',
  message: 'timezone must be a valid IANA timezone id (e.g. Europe/Madrid)',
} as const;

export function assertValidIanaTimezone(timezone: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new BadRequestException(INVALID_TIMEZONE);
  }
}

function zonedLocalInstantToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string,
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const readParts = (instantMs: number) => {
    const parts = formatter.formatToParts(new Date(instantMs));
    const map: Record<string, number> = {};
    for (const part of parts) {
      if (part.type === 'literal') {
        continue;
      }
      map[part.type] = Number(part.value);
    }
    return map;
  };

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = readParts(utcMs);
    const deltaMs =
      (year - parts.year) * 31 * 86_400_000 +
      (month - parts.month) * 31 * 86_400_000 +
      (day - parts.day) * 86_400_000 +
      (hour - parts.hour) * 3_600_000 +
      (minute - parts.minute) * 60_000 +
      (second - parts.second) * 1_000;
    if (deltaMs === 0) {
      return new Date(utcMs);
    }
    utcMs -= deltaMs;
  }
  return new Date(utcMs);
}

/** Inclusive local calendar month in `timeZone`, as UTC half-open interval [start, end). */
export function localMonthUtcBounds(
  year: number,
  month: number,
  timeZone: string,
): { startUtc: Date; endUtcExclusive: Date } {
  assertValidIanaTimezone(timeZone);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_REPORT_PERIOD',
      message: 'year must be between 2000 and 2100',
    });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_REPORT_PERIOD',
      message: 'month must be between 1 and 12',
    });
  }

  const startUtc = zonedLocalInstantToUtc(
    year,
    month,
    1,
    0,
    0,
    0,
    0,
    timeZone,
  );
  const next =
    month === 12
      ? { year: year + 1, month: 1 }
      : { year, month: month + 1 };
  const endUtcExclusive = zonedLocalInstantToUtc(
    next.year,
    next.month,
    1,
    0,
    0,
    0,
    0,
    timeZone,
  );
  return { startUtc, endUtcExclusive };
}

export function formatIsoDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}