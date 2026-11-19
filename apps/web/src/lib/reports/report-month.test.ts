import { currentYearMonthInTimezone, monthLabel, parseReportMonthQuery } from './report-month';

describe('report-month', () => {
  it('parses valid year and month query', () => {
    expect(parseReportMonthQuery('2026', '11', { year: 2025, month: 1 })).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it('falls back when query invalid', () => {
    expect(parseReportMonthQuery('abc', '13', { year: 2025, month: 3 })).toEqual({
      year: 2025,
      month: 3,
    });
  });

  it('returns year/month for UTC', () => {
    const result = currentYearMonthInTimezone('UTC');
    expect(result.year).toBeGreaterThanOrEqual(2000);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
  });

  it('formats month label in Spanish locale', () => {
    expect(monthLabel(2026, 1)).toMatch(/2026/);
  });
});
