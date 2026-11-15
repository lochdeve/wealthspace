export type GeneratedDebtDto = {
  fromUserId: string;
  toUserId: string;
  amount: string;
};

export function computeGeneratedDebts(
  paymentSource: 'MEMBER' | 'SPACE_ACCOUNT',
  paidByUserId: string | null,
  participants: { userId: string; allocatedAmount: string }[],
): GeneratedDebtDto[] {
  if (paymentSource === 'SPACE_ACCOUNT' || paidByUserId === null) {
    return [];
  }

  return participants
    .filter((p) => p.userId !== paidByUserId)
    .map((p) => ({
      fromUserId: p.userId,
      toUserId: paidByUserId,
      amount: p.allocatedAmount,
    }));
}
