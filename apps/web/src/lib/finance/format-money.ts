/** Display helper only — balance authority stays on the API. */
export function formatMoneyAmount(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}
