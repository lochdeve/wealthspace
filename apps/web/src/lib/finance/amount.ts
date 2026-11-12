/** Positive decimal with up to 4 fractional digits (income/expense). */
export const POSITIVE_AMOUNT_PATTERN = /^\d+(\.\d{1,4})?$/;

/** Signed decimal with up to 4 fractional digits (opening balance). */
export const SIGNED_AMOUNT_PATTERN = /^-?\d+(\.\d{1,4})?$/;

export function normalizeAmountInput(value: string): string {
  return value.trim();
}

export function isPositiveAmount(value: string): boolean {
  return POSITIVE_AMOUNT_PATTERN.test(normalizeAmountInput(value));
}

export function isSignedAmount(value: string): boolean {
  return SIGNED_AMOUNT_PATTERN.test(normalizeAmountInput(value));
}
