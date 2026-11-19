export type SettlementPersonalCashLink = {
  linked: boolean;
  canLink: boolean;
  side: 'from' | 'to';
};

export type Settlement = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
  occurredAt: string;
  recordedByUserId: string;
  voidedAt?: string | null;
  version: number;
  warnings?: string[];
  myPersonalCashLink?: SettlementPersonalCashLink;
};

export type CreateSettlementInput = {
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
  occurredAt?: string;
  personalCashFlow?: { accountId: string };
};

export type LinkSettlementPersonalCashFlowInput = {
  accountId: string;
  expectedVersion: number;
};

export type VoidSettlementInput = {
  expectedVersion: number;
  reason?: string;
};

export type ListSettlementsQuery = {
  userId?: string;
  includeVoided?: boolean;
  limit?: number;
};