import { formatMoneyAmount } from './format-money';

describe('formatMoneyAmount', () => {
  it('formats API decimal strings with Spanish locale', () => {
    const formatted = formatMoneyAmount('1250.5000', 'EUR');
    expect(formatted).toMatch(/1[\s.]?250/);
    expect(formatted).toMatch(/€|EUR/);
  });

  it('falls back when currency is invalid', () => {
    expect(formatMoneyAmount('10.0000', 'NOTREAL')).toBe('10.0000 NOTREAL');
  });
});
