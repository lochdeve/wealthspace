import { isPositiveAmount, isSignedAmount, normalizeAmountInput } from '@/lib/finance/amount';

describe('amount helpers', () => {
  it('normalizes whitespace', () => {
    expect(normalizeAmountInput('  10.5  ')).toBe('10.5');
  });

  it('validates positive cashflow amounts', () => {
    expect(isPositiveAmount('100')).toBe(true);
    expect(isPositiveAmount('0.1234')).toBe(true);
    expect(isPositiveAmount('-1')).toBe(false);
    expect(isPositiveAmount('10.12345')).toBe(false);
  });

  it('validates signed opening balance amounts', () => {
    expect(isSignedAmount('-250.0000')).toBe(true);
    expect(isSignedAmount('0')).toBe(true);
    expect(isSignedAmount('12.3.4')).toBe(false);
  });
});
