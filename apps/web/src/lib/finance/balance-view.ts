import { formatMoneyAmount } from '@/lib/finance/format-money';

export function debtLine(
  fromName: string,
  toName: string,
  amount: string,
  currency: string,
): string {
  return `${fromName} debe ${formatMoneyAmount(amount, currency)} a ${toName}`;
}

export function memberNetSummary(net: string, currency: string): string {
  const value = Number.parseFloat(net);
  if (Number.isNaN(value) || value === 0) {
    return 'En equilibrio';
  }
  if (value > 0) {
    return `Le deben ${formatMoneyAmount(net, currency)}`;
  }
  const positive = net.startsWith('-') ? net.slice(1) : net;
  return `Debe ${formatMoneyAmount(positive, currency)}`;
}

export function viewerAffectedByDebt(
  viewerUserId: string,
  fromUserId: string,
  toUserId: string,
): boolean {
  return viewerUserId === fromUserId || viewerUserId === toUserId;
}