import { normalizeAmountInput, POSITIVE_AMOUNT_PATTERN } from '@/lib/finance/amount';

const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!PERCENT_PATTERN.test(trimmed)) {
    return null;
  }
  return Number.parseFloat(trimmed);
}

export function percentSplitHint(percents: string[]): string | null {
  let sum = 0;
  for (const raw of percents) {
    const parsed = parsePercent(raw);
    if (parsed === null) {
      return null;
    }
    sum += parsed;
  }
  const delta = Math.round((sum - 100) * 100) / 100;
  if (delta === 0) {
    return 'Los porcentajes suman 100 %.';
  }
  if (delta > 0) {
    return `Sobran ${delta.toFixed(2)} % (debe sumar 100 %).`;
  }
  return `Faltan ${Math.abs(delta).toFixed(2)} % (debe sumar 100 %).`;
}

function parseMoney(value: string): number | null {
  const trimmed = normalizeAmountInput(value);
  if (!POSITIVE_AMOUNT_PATTERN.test(trimmed)) {
    return null;
  }
  return Number.parseFloat(trimmed);
}

export function fixedAmountSplitHint(totalAmount: string, shareAmounts: string[]): string | null {
  const total = parseMoney(totalAmount);
  if (total === null) {
    return null;
  }
  let sum = 0;
  for (const raw of shareAmounts) {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = parseMoney(trimmed);
    if (parsed === null) {
      return null;
    }
    sum += parsed;
  }
  const delta = Math.round((sum - total) * 10_000) / 10_000;
  if (delta === 0) {
    return 'Los importes suman el total del gasto.';
  }
  if (delta > 0) {
    return `Sobran ${delta.toFixed(4).replace(/\.?0+$/, '')} respecto al total.`;
  }
  return `Faltan ${Math.abs(delta)
    .toFixed(4)
    .replace(/\.?0+$/, '')} para llegar al total.`;
}
