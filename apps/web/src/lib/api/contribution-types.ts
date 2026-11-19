export type CreateContributionInput = {
  sharedAccountId: string;
  amount: string;
  currency: string;
  occurredAt?: string;
  personalAccountId?: string;
  note?: string;
};

export type ContributionResult = {
  sharedIncomeTransactionId: string;
  sharedAccountId: string;
  amount: string;
  currency: string;
  occurredAt: string;
  attributedToUserId?: string;
  contributionGroupId?: string;
  personalLegLinked: boolean;
};