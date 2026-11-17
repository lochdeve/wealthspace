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
};

export type CreateSettlementInput = {
  fromUserId: string;
  toUserId: string;
  amount: string;
  currency: string;
  occurredAt?: string;
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