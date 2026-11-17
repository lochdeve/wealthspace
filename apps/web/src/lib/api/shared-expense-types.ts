export type SplitMode = 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT';

export type PaymentSource = 'MEMBER' | 'SPACE_ACCOUNT';

export type SharedExpenseMemberPayment = {
  source: 'MEMBER';
  paidByUserId: string;
};

export type SharedExpenseAccountPayment = {
  source: 'SPACE_ACCOUNT';
  accountId: string;
};

export type SplitEqualInput = {
  mode: 'EQUAL';
  participantUserIds: string[];
};

export type SplitPercentageInput = {
  mode: 'PERCENTAGE';
  shares: { userId: string; percent: string }[];
};

export type SplitFixedAmountInput = {
  mode: 'FIXED_AMOUNT';
  shares: { userId: string; amount: string }[];
};

export type SplitInput = SplitEqualInput | SplitPercentageInput | SplitFixedAmountInput;

export type CreateSharedExpenseInput = {
  description?: string;
  totalAmount: string;
  currency?: string;
  occurredAt?: string;
  categoryId?: string;
  payment: SharedExpenseMemberPayment | SharedExpenseAccountPayment;
  split: SplitInput;
};

export type SharedExpenseParticipant = {
  userId: string;
  displayName: string;
  allocatedAmount: string;
  sharePercent?: string | null;
};

export type GeneratedDebt = {
  fromUserId: string;
  toUserId: string;
  amount: string;
};

export type SharedExpenseDetail = {
  id: string;
  description?: string;
  totalAmount: string;
  currency: string;
  occurredAt: string;
  splitMode: SplitMode;
  payment: SharedExpenseMemberPayment | SharedExpenseAccountPayment;
  participants: SharedExpenseParticipant[];
  generatedDebts: GeneratedDebt[];
  recordedByUserId: string;
  voidedAt?: string | null;
  version: number;
};

export type UpdateSharedExpenseInput = CreateSharedExpenseInput & {
  expectedVersion: number;
  reason?: string;
};

export type VoidSharedExpenseInput = {
  expectedVersion: number;
  reason?: string;
};

export type SharedExpenseRevision = {
  revisionNumber: number;
  changedAt: string;
  changedByUserId: string;
  reason?: string | null;
  snapshot: Record<string, unknown>;
};
