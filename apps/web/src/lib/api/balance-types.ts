export type PairDebt = {
  fromUserId: string;
  toUserId: string;
  amount: string;
};

export type MemberNetBalance = {
  userId: string;
  net: string;
};

export type CurrencyBalances = {
  currency: string;
  debts: PairDebt[];
  members: MemberNetBalance[];
};

export type SpaceBalances = {
  currencies: CurrencyBalances[];
};