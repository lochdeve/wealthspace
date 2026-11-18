const DEFAULT_LOCALE = 'es-ES';

function parseAmountString(amount: string): number | null {
  const trimmed = amount.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Display helper only — balance authority stays on the API. */
export function formatMoneyAmount(
  amount: string,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const value = parseAmountString(amount);
  if (value === null) {
    return `${amount} ${currency}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
}