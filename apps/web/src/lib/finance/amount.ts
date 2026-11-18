/** Positive decimal with up to 4 fractional digits (income/expense). */
export const POSITIVE_AMOUNT_PATTERN = /^\d+(\.\d{1,4})?$/;

/** Signed decimal with up to 4 fractional digits (opening balance). */
export const SIGNED_AMOUNT_PATTERN = /^-?\d+(\.\d{1,4})?$/;

/** Normalize user typing: trim, optional thousands spaces, comma → dot. */
export function normalizeAmountInput(value: string): string {
  const trimmed = value.trim().replace(/\s/g, '');
  if (trimmed.includes(',') && !trimmed.includes('.')) {
    return trimmed.replace(',', '.');
  }
  return trimmed.replace(',', '.');
}

export function isPositiveAmount(value: string): boolean {
  return POSITIVE_AMOUNT_PATTERN.test(normalizeAmountInput(value));
}

export function isSignedAmount(value: string): boolean {
  return SIGNED_AMOUNT_PATTERN.test(normalizeAmountInput(value));
}
